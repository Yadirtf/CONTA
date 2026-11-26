import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hayBase } from '../integracion/aislamiento/base-de-pruebas.js';
import { MAXIMO_DE_BUSQUEDAS } from '../../src/modulos/catalogo/presentacion/http/limite-de-busquedas.js';
import { celularAlAzar, crearAppConCelulares, entrar } from './apoyo/app-con-sesiones.js';

// HU-05.01 de punta a punta: el cajero busca al comprador por su documento, ve el dígito de verificación al
// escribir un NIT, crea compradores nuevos y usa «consumidor final». Otra empresa no ve nada de esto.

interface Respuesta {
  id: string | null;
  numero: string;
  digitoVerificacion: number | null;
  nombre: string;
  esConsumidorFinal: boolean;
}

/** NIT al azar para no chocar con corridas anteriores en la misma base (empieza por 9: sin cero adelante). */
const nitAlAzar = (): string => `9${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

describe.skipIf(!hayBase)('clientes (e2e)', () => {
  const celulares = { dueno: celularAlAzar(), cajero: celularAlAzar(), ajeno: celularAlAzar() };
  let app: INestApplication;
  const sesion = { dueno: '', cajero: '', ajeno: '' };
  const empresa = { propia: '', ajena: '' };
  const nit = nitAlAzar();

  const api = () => request(app.getHttpServer());
  const como = (quien: keyof typeof sesion, enEmpresa = empresa.propia) => ({
    get: (ruta: string) => api().get(ruta).set('Authorization', sesion[quien]).set('X-Empresa', enEmpresa),
    post: (ruta: string, cuerpo: object) => api().post(ruta).set('Authorization', sesion[quien]).set('X-Empresa', enEmpresa).send(cuerpo),
  });
  const buscar = (quien: keyof typeof sesion, documento: string, enEmpresa = empresa.propia) =>
    como(quien, enEmpresa).post('/clientes/busqueda', { documento });
  const ferreteria = (cambios: object = {}) => ({
    id: randomUUID(),
    tipoDocumento: '31',
    numero: nit,
    nombre: 'Ferretería El Tornillo S.A.S.',
    tipoDePersona: 'juridica',
    responsabilidadesFiscales: ['O-13'],
    responsableDeIva: true,
    correo: 'compras@eltornillo.co',
    ...cambios,
  });

  beforeAll(async () => {
    app = await crearAppConCelulares(Object.values(celulares));
    for (const quien of Object.keys(sesion) as (keyof typeof sesion)[]) sesion[quien] = await entrar(app, celulares[quien]);
    const crearEmpresa = async (quien: keyof typeof sesion, razonSocial: string) =>
      ((await api().post('/empresas').set('Authorization', sesion[quien]).send({ razonSocial }).expect(201)).body as { id: string }).id;
    empresa.propia = await crearEmpresa('dueno', 'Tienda Doña Rosa');
    empresa.ajena = await crearEmpresa('ajeno', 'La competencia');
    await como('dueno').post('/miembros', { celular: celulares.cajero, rol: 'cajero' }).expect(201);
    await api().post(`/empresas/${empresa.propia}/invitacion/aceptar`).set('Authorization', sesion.cajero).expect(204);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('al escribir un NIT, la búsqueda calcula su dígito de verificación aunque no haya compradores', async () => {
    const { body, headers } = await buscar('cajero', nit).expect(200);
    expect(headers['cache-control']).toBe('no-store');
    expect(body).toEqual({ nit: { numero: nit, digitoVerificacion: expect.any(Number) as number }, clientes: [] });
  });

  it('el cajero crea un comprador nuevo; un dígito equivocado se rechaza', async () => {
    const { body: busqueda } = await buscar('cajero', nit).expect(200);
    const digito = (busqueda as { nit: { digitoVerificacion: number } }).nit.digitoVerificacion;
    const errado = await como('cajero').post('/clientes', ferreteria({ digitoVerificacion: (digito + 1) % 10 })).expect(400);
    expect(errado.body).toMatchObject({ codigo: 'nit.digito-invalido' });

    const { body } = await como('cajero').post('/clientes', ferreteria({ digitoVerificacion: digito })).expect(201);
    expect(body).toMatchObject({ numero: nit, digitoVerificacion: digito, esConsumidorFinal: false, responsabilidadesFiscales: ['O-13'] });
  }, 30_000);

  it('crear otra vez el mismo documento devuelve el guardado (200) sin duplicarlo', async () => {
    const { body } = await como('dueno').post('/clientes', ferreteria({ nombre: 'Otro nombre' })).expect(200);
    expect((body as Respuesta).nombre).toBe('Ferretería El Tornillo S.A.S.');
    const { body: encontrados } = await buscar('cajero', nit.slice(0, 5)).expect(200);
    const iguales = (encontrados as { clientes: Respuesta[] }).clientes.filter((c) => c.numero === nit);
    expect(iguales).toHaveLength(1);
    // La lista no trae datos de contacto: buscar no sirve para sacar los correos de todos (ataque H5).
    expect(Object.keys(iguales[0]!).sort()).toEqual(['digitoVerificacion', 'id', 'nombre', 'numero', 'tipoDePersona', 'tipoDocumento']);
  });

  it('repetir la misma petición (mismo id) no crea dos', async () => {
    const vecina = { id: randomUUID(), tipoDocumento: '13', numero: `1${nit}`, nombre: 'Rosa Pérez', tipoDePersona: 'natural' };
    await como('cajero').post('/clientes', vecina).expect(201);
    const { body } = await como('cajero').post('/clientes', vecina).expect(200);
    expect(body).toMatchObject({ id: vecina.id, responsabilidadesFiscales: ['R-99-PN'], digitoVerificacion: null });
  });

  it('existe «consumidor final» y su número no se puede usar para un comprador', async () => {
    const { body } = await como('cajero').get('/clientes/consumidor-final').expect(200);
    expect(body).toMatchObject({ id: null, esConsumidorFinal: true, tipoDocumento: '13', numero: '222222222222', nombre: 'Consumidor final' });
    const reservado = await como('cajero')
      .post('/clientes', { id: randomUUID(), tipoDocumento: '13', numero: '222222222222', nombre: 'X', tipoDePersona: 'natural' })
      .expect(400);
    expect(reservado.body).toMatchObject({ codigo: 'cliente.consumidor-final' });
  });

  it('otra empresa no ve los compradores ni los encuentra por documento', async () => {
    const { body } = await buscar('ajeno', nit, empresa.ajena).expect(200);
    expect((body as { clientes: Respuesta[] }).clientes).toEqual([]);
    // Ni con su sesión puede pedir la empresa propia.
    await buscar('ajeno', nit, empresa.propia).expect(404);
    // El mismo documento en la otra empresa es otro comprador.
    await como('ajeno', empresa.ajena).post('/clientes', ferreteria()).expect(201);
  }, 30_000);

  it('sin sesión o sin empresa no hay búsqueda; un término corto o con comodines se rechaza', async () => {
    await api().post('/clientes/busqueda').send({ documento: nit }).expect(401);
    await api().post('/clientes/busqueda').set('Authorization', sesion.cajero).send({ documento: nit }).expect(400);
    expect((await buscar('cajero', '9%').expect(400)).body).toMatchObject({ codigo: 'cliente.busqueda-invalida' });
    expect((await buscar('cajero', '___').expect(400)).body).toMatchObject({ codigo: 'cliente.busqueda-invalida' });
  });

  it('recorrer prefijos para sacar la lista entera se frena con 429 (ataque H5)', async () => {
    let respuesta = await buscar('dueno', '100');
    for (let i = 1; i <= MAXIMO_DE_BUSQUEDAS && respuesta.status === 200; i++) respuesta = await buscar('dueno', String(100 + i));
    expect(respuesta.status).toBe(429);
    expect(respuesta.body).toMatchObject({ codigo: 'cliente.limite-de-busquedas' });
    // El límite es por persona: el cajero sigue buscando.
    await buscar('cajero', '100').expect(200);
  }, 30_000);

  it('un nombre con controles C1 o un correo con NUL no rompen la API (ataque H2)', async () => {
    const conC1 = { id: randomUUID(), tipoDocumento: '13', numero: `2${nit}`, nombre: 'Ro\u0085sa\u202e', tipoDePersona: 'natural' };
    expect((await como('cajero').post('/clientes', conC1).expect(201)).body).toMatchObject({ nombre: 'Ro sa' });
    const conNul = { ...conC1, id: randomUUID(), numero: `3${nit}`, correo: 'a\u0000@b.co' };
    expect((await como('cajero').post('/clientes', conNul).expect(400)).body).toMatchObject({ codigo: 'cliente.correo-invalido' });
  });
});
