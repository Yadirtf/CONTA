import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { hayBase, url } from '../integracion/aislamiento/base-de-pruebas.js';
import { celularAlAzar, crearAppConCelulares, entrar, pasarSegundoFactor } from './apoyo/app-con-sesiones.js';

// HU-07.04 de punta a punta: el dueño, con la verificación en dos pasos reciente, carga su configuración DIAN y la
// lee sin ver nunca el PIN ni la clave técnica; el cajero no entra; sin verificación reciente no se cambia nada.

const SOFTWARE = '56f2ae4e-9812-4fad-9255-08fcfcd5ccb0';
const TEST_SET = '3f2a8a2e-1b8c-4a7e-9b6f-2d9b1c0a7e11';
const DATOS = {
  nit: '900373076',
  digitoVerificacion: 4,
  razonSocial: 'Tienda Don Pepe S.A.S.',
  tipoDePersona: 'juridica',
  responsabilidadesFiscales: ['O-13'],
  responsableDeIva: true,
  direccion: { codigoMunicipio: '11001', ciudad: 'Bogotá, D.C.', departamento: 'Bogotá', linea: 'Calle 1 # 2-3' },
  correo: 'facturas@donpepe.co',
};

describe.skipIf(!hayBase)('configuración DIAN (e2e)', () => {
  const celulares = { dueno: celularAlAzar(), cajero: celularAlAzar() };
  let app: INestApplication;
  const sesion = { dueno: '', cajero: '' };
  let empresa: string;

  const api = () => request(app.getHttpServer());
  const como = (quien: keyof typeof sesion) => ({
    get: (ruta: string) => api().get(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa),
    put: (ruta: string, cuerpo: object) => api().put(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa).send(cuerpo),
    post: (ruta: string, cuerpo: object) => api().post(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa).send(cuerpo),
  });

  /** Mueve la verificación de la sesión del dueño al pasado: ya no es reciente, pero sigue en la jornada. */
  async function verificacionDeHace(minutos: number): Promise<void> {
    const cliente = new pg.Client({ connectionString: process.env['DATABASE_URL_DUENO'] ?? url });
    await cliente.connect();
    try {
      await cliente.query(
        `UPDATE conta_identidad.sesiones
            SET creada_en = LEAST(creada_en, now() - make_interval(mins => $1)), verificada_en = now() - make_interval(mins => $1)
          WHERE usuario_id = (SELECT id FROM conta_identidad.usuarios WHERE celular = $2) AND verificada_en IS NOT NULL`,
        [minutos, `+57${celulares.dueno}`],
      );
    } finally {
      await cliente.end();
    }
  }

  beforeAll(async () => {
    process.env['SECRETO_CONFIGURACION_DIAN'] ??= 'clave-de-pruebas-de-la-configuracion-dian-e2e';
    app = await crearAppConCelulares(Object.values(celulares));
    sesion.dueno = await entrar(app, celulares.dueno);
    sesion.cajero = await entrar(app, celulares.cajero);
    empresa = ((await api().post('/empresas').set('Authorization', sesion.dueno).send({ razonSocial: 'Tienda Don Pepe' }).expect(201)).body as { id: string }).id;
    await como('dueno').post('/miembros', { celular: celulares.cajero, rol: 'cajero' }).expect(201);
    await api().post(`/empresas/${empresa}/invitacion/aceptar`).set('Authorization', sesion.cajero).expect(204);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('sin la verificación en dos pasos, el dueño no la ve; el cajero nunca', async () => {
    expect((await como('dueno').get('/configuracion-dian').expect(403)).body).toMatchObject({ codigo: 'acceso.segundo-factor-requerido' });
    expect((await como('cajero').get('/configuracion-dian').expect(403)).body).toMatchObject({ codigo: 'permiso.denegado' });
    expect((await como('cajero').put('/configuracion-dian/preferencias', { siempreFactura: true }).expect(403)).body).toMatchObject({
      codigo: 'permiso.denegado',
    });
  });

  it('el dueño verificado carga todo y lo que lee no trae el PIN ni la clave técnica', async () => {
    await pasarSegundoFactor(app, sesion.dueno);
    const vacia = (await como('dueno').get('/configuracion-dian').expect(200)).body as { loQueFalta: { pendientes: string[] } };
    expect(vacia.loQueFalta.pendientes).toEqual(['datos-fiscales', 'resolucion-factura', 'software-factura']);

    await como('dueno').put('/configuracion-dian/datos-fiscales', DATOS).expect(204);
    const resolucion = {
      id: randomUUID(),
      clase: 'factura',
      numero: '18760000001',
      prefijo: 'SETP',
      desde: 990000000,
      hasta: 995000000,
      vigenteDesde: '2019-01-19',
      vigenteHasta: '2030-01-19',
      claveTecnica: 'clave-tecnica-secreta-del-rango',
    };
    await como('dueno').post('/configuracion-dian/resoluciones', resolucion).expect(201);
    await como('dueno').post('/configuracion-dian/resoluciones', resolucion).expect(200);
    await como('dueno').put('/configuracion-dian/software/factura', { idSoftware: SOFTWARE, pin: 'pin2468', testSetId: TEST_SET }).expect(204);
    await como('dueno').put('/configuracion-dian/preferencias', { siempreFactura: true }).expect(204);

    const leida = await como('dueno').get('/configuracion-dian').expect(200);
    expect(leida.headers['cache-control']).toBe('no-store');
    expect(leida.text).not.toContain('pin2468');
    expect(leida.text).not.toContain('clave-tecnica-secreta');
    expect(leida.body).toMatchObject({
      datosFiscales: { nit: '900373076', digitoVerificacion: 4 },
      software: { factura: { idSoftware: SOFTWARE, pin: '•••8' }, pos: null },
      siempreFactura: true,
      loQueFalta: { puedeFacturar: true, pendientes: [] },
    });
    expect((leida.body as { cambios: { hechoPorMi: boolean }[] }).cambios.every((c) => c.hechoPorMi)).toBe(true);
  }, 30_000);

  it('una resolución guardada no se edita: no hay ruta para cambiarla ni borrarla', async () => {
    const id = randomUUID();
    await api().put(`/configuracion-dian/resoluciones/${id}`).set('Authorization', sesion.dueno).set('X-Empresa', empresa).send({}).expect(404);
    await api().delete(`/configuracion-dian/resoluciones/${id}`).set('Authorization', sesion.dueno).set('X-Empresa', empresa).expect(404);
  });

  it('con la verificación de la jornada lee, pero para cambiar pide una reciente', async () => {
    await verificacionDeHace(30);
    await como('dueno').get('/configuracion-dian').expect(200);
    const respuesta = await como('dueno').put('/configuracion-dian/software/factura', { idSoftware: SOFTWARE, pin: '99999', testSetId: TEST_SET }).expect(403);
    expect(respuesta.body).toMatchObject({ codigo: 'acceso.segundo-factor-reciente-requerido' });
  });

  it('un JSON mal formado responde 400 sin repetir el cuerpo, aunque no haya sesión (hallazgo B2)', async () => {
    const respuesta = await api()
      .put('/configuracion-dian/software/factura')
      .set('Content-Type', 'application/json')
      .send('{"pin":FUGAPIN2468}')
      .expect(400);
    expect(respuesta.text).not.toContain('FUGAPIN2468');
    expect(respuesta.body).toEqual({ codigo: 'peticion.json-invalido', mensaje: 'El cuerpo no es un JSON válido' });
  });

  it('los datos mal escritos responden 400 sin repetir lo recibido', async () => {
    await verificacionDeHace(0);
    const mal = await como('dueno').put('/configuracion-dian/software/factura', { idSoftware: SOFTWARE, pin: 'pin con espacios', testSetId: TEST_SET }).expect(400);
    expect(mal.text).not.toContain('pin con espacios');
    await como('dueno').put('/configuracion-dian/software/otra', { idSoftware: SOFTWARE, testSetId: TEST_SET }).expect(400);
    await como('dueno').put('/configuracion-dian/datos-fiscales', { ...DATOS, digitoVerificacion: 7 }).expect(400);
  });

  it('más de 30 cambios en 10 minutos responden 429 con Retry-After (hallazgo B5)', async () => {
    await verificacionDeHace(0);
    let ultima = 204;
    // Ya hubo cambios en las pruebas anteriores: basta con llegar al tope.
    for (let i = 0; i < 31 && ultima !== 429; i++) {
      ultima = (await como('dueno').put('/configuracion-dian/preferencias', { siempreFactura: i % 2 === 0 })).status;
    }
    expect(ultima).toBe(429);
    const bloqueada = await como('dueno').put('/configuracion-dian/preferencias', { siempreFactura: true }).expect(429);
    expect(bloqueada.headers['retry-after']).toMatch(/^\d+$/);
    expect(bloqueada.body).toMatchObject({ codigo: 'configuracion.limite' });
  });
});
