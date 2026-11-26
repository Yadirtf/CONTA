import type { INestApplication } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { codigoDeLaApp } from '../apoyo/app-autenticadora.js';
import { hayBase, url } from '../integracion/aislamiento/base-de-pruebas.js';
import { celularAlAzar, crearAppConCelulares, entrar } from './apoyo/app-con-sesiones.js';

// HU-04.04 de punta a punta: un contador configura su app autenticadora, verifica una sesión, recupera el
// acceso con un código de recuperación, y quien solo tiene su WhatsApp no puede poner otra app.

interface Estado {
  inscrito: boolean;
  verificadaHasta: string | null;
  codigosDeRecuperacionRestantes: number;
}

describe.skipIf(!hayBase)('segundo factor (e2e)', () => {
  const celular = celularAlAzar();
  let app: INestApplication;
  let primera: string;
  let secreto: string;
  let recuperacion: string[];

  const api = () => request(app.getHttpServer());
  const estado = async (autorizacion: string) =>
    (await api().get('/acceso/segundo-factor').set('Authorization', autorizacion).expect(200)).body as Estado;
  const verificar = (autorizacion: string, codigo: string) =>
    api().post('/acceso/segundo-factor/verificacion').set('Authorization', autorizacion).send({ codigo });

  beforeAll(async () => {
    app = await crearAppConCelulares([celular]);
    primera = await entrar(app, celular);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('pide sesión', async () => {
    await api().get('/acceso/segundo-factor').expect(401);
    await api().post('/acceso/segundo-factor/inscripcion').expect(401);
  });

  it('configura la app: la clave se muestra una vez y un código incorrecto dice cuántos intentos quedan', async () => {
    expect(await estado(primera)).toEqual({ inscrito: false, verificadaHasta: null, codigosDeRecuperacionRestantes: 0 });
    expect((await verificar(primera, '123456').expect(409)).body).toMatchObject({ codigo: 'segundo-factor.sin-inscribir' });

    const { body, headers } = await api().post('/acceso/segundo-factor/inscripcion').set('Authorization', primera).expect(201);
    expect(headers['cache-control']).toBe('no-store');
    secreto = (body as { secreto: string; uri: string }).secreto;
    expect((body as { uri: string }).uri).toContain(`secret=${secreto}`);

    const mal = await api().post('/acceso/segundo-factor/inscripcion/confirmacion').set('Authorization', primera).send({ codigo: '000000' });
    expect(mal.status).toBe(422);
    expect(mal.body).toMatchObject({ codigo: 'segundo-factor.codigo-incorrecto', intentosRestantes: 4 });
    const malEscrito = await api().post('/acceso/segundo-factor/inscripcion/confirmacion').set('Authorization', primera).send({ codigo: 'hola' });
    expect(malEscrito.status).toBe(400);

    const confirmada = await api()
      .post('/acceso/segundo-factor/inscripcion/confirmacion')
      .set('Authorization', primera)
      .send({ codigo: codigoDeLaApp(secreto, new Date()) })
      .expect(201);
    recuperacion = (confirmada.body as { codigosDeRecuperacion: string[] }).codigosDeRecuperacion;
    expect(recuperacion).toHaveLength(10);
    expect(await estado(primera)).toMatchObject({ inscrito: true, codigosDeRecuperacionRestantes: 10 });
    expect((await estado(primera)).verificadaHasta).not.toBeNull();
  }, 30_000);

  it('en un dispositivo nuevo hay que verificar; el código ya usado no sirve otra vez', async () => {
    // Otra sesión de la misma persona (como un teléfono nuevo): el mismo celular de prueba sirve tras la espera.
    const otra = await entrarOtraVez();
    expect((await estado(otra)).verificadaHasta).toBeNull();
    const codigo = codigoDeLaApp(secreto, new Date(), 1);
    expect((await verificar(otra, codigo).expect(201)).body).toMatchObject({ via: 'app' });
    expect((await estado(otra)).verificadaHasta).not.toBeNull();
    expect((await verificar(otra, codigo).expect(422)).body).toMatchObject({ codigo: 'segundo-factor.codigo-incorrecto' });
  }, 30_000);

  it('quien solo tiene el WhatsApp no puede poner otra app; con un código de recuperación sí verifica', async () => {
    const ladron = await entrarOtraVez();
    const cambio = await api().post('/acceso/segundo-factor/inscripcion').set('Authorization', ladron).expect(409);
    expect(cambio.body).toMatchObject({ codigo: 'segundo-factor.ya-inscrito' });

    const conRecuperacion = await verificar(ladron, recuperacion[0]!.toLowerCase()).expect(201);
    expect(conRecuperacion.body).toMatchObject({ via: 'recuperacion', codigosDeRecuperacionRestantes: 9 });
    await verificar(ladron, recuperacion[0]!).expect(422);
  }, 30_000);

  /**
   * Otra sesión de la misma persona, como un teléfono nuevo que ya pasó el código de WhatsApp. Se escribe en la
   * base porque cada celular solo puede pedir un código por minuto (HU-04.01) y esperar haría lenta la prueba.
   */
  async function entrarOtraVez(): Promise<string> {
    const { body } = await api().get('/acceso/yo').set('Authorization', primera).expect(200);
    const token = randomBytes(32).toString('base64url');
    const cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
    try {
      await cliente.query(
        `INSERT INTO conta_identidad.sesiones (id, usuario_id, huella_token, creada_en, vence_en)
         VALUES ($1, $2, $3, now(), now() + interval '1 day')`,
        [randomUUID(), (body as { id: string }).id, createHash('sha256').update(token).digest('hex')],
      );
    } finally {
      await cliente.end();
    }
    return `Bearer ${token}`;
  }
});
