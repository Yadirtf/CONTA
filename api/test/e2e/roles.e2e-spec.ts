import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hayBase } from '../integracion/aislamiento/base-de-pruebas.js';
import { celularAlAzar, crearAppConCelulares, entrar } from './apoyo/app-con-sesiones.js';
import { EndpointsProtegidosModule } from './apoyo/endpoints-protegidos.js';

// HU-04.03 de punta a punta: el dueño invita a su cajero y a su contador; el cajero vende pero recibe
// «no tienes permiso» en informes, anulaciones y gestión de personas; el modo llega con la membresía.

interface MiEmpresa {
  id: string;
  rol: string;
  modo: string;
  estado: string;
  permisos: string[];
}

interface Miembro {
  usuarioId: string;
  celular: string;
  rol: string;
  modo: string;
  estado: string;
}

const NO_TIENES_PERMISO = { codigo: 'permiso.denegado', mensaje: 'No tienes permiso' };

describe.skipIf(!hayBase)('roles y modos (e2e)', () => {
  const celulares = { dueno: celularAlAzar(), cajero: celularAlAzar(), contador: celularAlAzar() };
  let app: INestApplication;
  const sesion = { dueno: '', cajero: '', contador: '' };
  let empresa: string;
  let cajero: Miembro;
  let contador: Miembro;

  const api = () => request(app.getHttpServer());
  const como = (quien: keyof typeof sesion) => ({
    get: (ruta: string) => api().get(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa),
    post: (ruta: string, cuerpo: object = {}) => api().post(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa).send(cuerpo),
    patch: (ruta: string, cuerpo: object) => api().patch(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa).send(cuerpo),
    delete: (ruta: string) => api().delete(ruta).set('Authorization', sesion[quien]).set('X-Empresa', empresa),
  });
  const misEmpresas = async (quien: keyof typeof sesion) =>
    (await api().get('/empresas').set('Authorization', sesion[quien]).expect(200)).body as MiEmpresa[];
  const aceptar = (quien: keyof typeof sesion) =>
    api().post(`/empresas/${empresa}/invitacion/aceptar`).set('Authorization', sesion[quien]);

  beforeAll(async () => {
    app = await crearAppConCelulares(Object.values(celulares), [EndpointsProtegidosModule]);
    sesion.dueno = await entrar(app, celulares.dueno);
    sesion.cajero = await entrar(app, celulares.cajero);
    sesion.contador = await entrar(app, celulares.contador);
    const creada = await api().post('/empresas').set('Authorization', sesion.dueno).send({ razonSocial: 'Tienda Doña Rosa' }).expect(201);
    expect(creada.body).toMatchObject({ rol: 'dueno', modo: 'simple', estado: 'activa' });
    empresa = (creada.body as MiEmpresa).id;
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('el dueño invita a su cajero por celular; la invitación espera a que la acepte', async () => {
    const { body } = await como('dueno').post('/miembros', { celular: celulares.cajero, rol: 'cajero' }).expect(201);
    cajero = body as Miembro;
    expect(cajero).toMatchObject({ rol: 'cajero', modo: 'simple', estado: 'invitada' });
    expect(cajero.celular).toMatch(/^\+57 \d{3} \*\*\* \d{4}$/);
    expect(cajero.celular.replace(/\D/g, '')).not.toContain(celulares.cajero);

    expect(await misEmpresas('cajero')).toEqual([expect.objectContaining({ id: empresa, rol: 'cajero', estado: 'invitada' })]);
    await como('cajero').get(`/empresas/${empresa}`).expect(404);
    await aceptar('cajero').expect(204);
    await aceptar('cajero').expect(404);
    await como('cajero').get(`/empresas/${empresa}`).expect(200);
  }, 30_000);

  it('el modo y los permisos llegan de la API con la membresía', async () => {
    const [deCajero] = await misEmpresas('cajero');
    expect(deCajero).toMatchObject({ rol: 'cajero', modo: 'simple', estado: 'activa', permisos: ['ver-empresa', 'vender'] });
    const [deDueno] = await misEmpresas('dueno');
    expect(deDueno?.permisos).toContain('gestionar-miembros');
  });

  it('el cajero vende, pero al abrir informes o anular documentos recibe «no tienes permiso»', async () => {
    await como('cajero').post('/pruebas/ventas').expect(201);
    const informes = await como('cajero').get('/pruebas/informes').expect(403);
    const anular = await como('cajero').post('/pruebas/anulaciones').expect(403);
    expect(informes.body).toEqual(NO_TIENES_PERMISO);
    expect(anular.body).toEqual(NO_TIENES_PERMISO);
  }, 30_000);

  it('el cajero no gestiona personas: ni las ve, ni invita, ni se sube de rol', async () => {
    expect((await como('cajero').get('/miembros').expect(403)).body).toEqual(NO_TIENES_PERMISO);
    await como('cajero').post('/miembros', { celular: celularAlAzar(), rol: 'dueno' }).expect(403);
    await como('cajero').patch(`/miembros/${cajero.usuarioId}`, { rol: 'dueno' }).expect(403);
  }, 30_000);

  it('el contador entra en modo contador, abre informes y anula, pero no gestiona personas', async () => {
    const { body } = await como('dueno').post('/miembros', { celular: celulares.contador, rol: 'contador' }).expect(201);
    contador = body as Miembro;
    expect(contador).toMatchObject({ rol: 'contador', modo: 'contador' });
    await aceptar('contador').expect(204);
    expect(await misEmpresas('contador')).toEqual([expect.objectContaining({ rol: 'contador', modo: 'contador' })]);
    await como('contador').get('/pruebas/informes').expect(200);
    await como('contador').post('/pruebas/anulaciones').expect(201);
    await como('contador').get('/miembros').expect(403);
  }, 30_000);

  it('el dueño ve a su gente, cambia modos y roles con reglas, y nunca deja la empresa sin dueño', async () => {
    const { body: lista } = await como('dueno').get('/miembros').expect(200);
    expect((lista as Miembro[]).map((m) => m.rol).sort()).toEqual(['cajero', 'contador', 'dueno']);

    const modoContador = await como('dueno').patch(`/miembros/${cajero.usuarioId}`, { modo: 'contador' }).expect(400);
    expect(modoContador.body).toMatchObject({ codigo: 'miembro.modo-no-permitido' });
    await como('dueno').patch(`/miembros/${contador.usuarioId}`, { modo: 'simple' }).expect(200);

    const dueno = (lista as Miembro[]).find((m) => m.rol === 'dueno')!;
    const propio = await como('dueno').patch(`/miembros/${dueno.usuarioId}`, { rol: 'cajero' }).expect(409);
    expect(propio.body).toMatchObject({ codigo: 'miembro.sobre-si-mismo' });
    const salirse = await como('dueno').delete(`/miembros/${dueno.usuarioId}`).expect(409);
    expect(salirse.body).toMatchObject({ codigo: 'miembro.ultimo-dueno' });

    const repetida = await como('dueno').post('/miembros', { celular: celulares.cajero, rol: 'cajero' }).expect(409);
    expect(repetida.body).toMatchObject({ codigo: 'miembro.ya-esta' });
    const invalido = await como('dueno').post('/miembros', { celular: '12345', rol: 'cajero' }).expect(400);
    expect(invalido.body).toMatchObject({ codigo: 'acceso.celular-invalido' });
  }, 30_000);

  it('un cambio de rol cuenta desde la petición siguiente', async () => {
    await como('dueno').patch(`/miembros/${cajero.usuarioId}`, { rol: 'contador' }).expect(200);
    await como('cajero').get('/pruebas/informes').expect(200);
    await como('dueno').patch(`/miembros/${cajero.usuarioId}`, { rol: 'cajero' }).expect(200);
    await como('cajero').get('/pruebas/informes').expect(403);
  }, 30_000);

  it('un endpoint sin @Requiere se niega aunque pida el dueño', async () => {
    const { body } = await como('dueno').get('/pruebas/sin-permiso-declarado').expect(500);
    expect(JSON.stringify(body)).not.toContain('fuga');
  });

  it('al retirar al cajero, deja de ver la empresa en la petición siguiente; puede volver con otra invitación', async () => {
    await como('dueno').delete(`/miembros/${cajero.usuarioId}`).expect(204);
    await como('cajero').get(`/empresas/${empresa}`).expect(404);
    await como('cajero').post('/pruebas/ventas').expect(404);
    expect(await misEmpresas('cajero')).toEqual([]);
    await como('dueno').delete(`/miembros/${cajero.usuarioId}`).expect(404);

    await como('dueno').post('/miembros', { celular: celulares.cajero, rol: 'cajero' }).expect(201);
    expect(await misEmpresas('cajero')).toEqual([expect.objectContaining({ estado: 'invitada' })]);
    await api().post(`/empresas/${empresa}/invitacion/rechazar`).set('Authorization', sesion.cajero).expect(204);
    expect(await misEmpresas('cajero')).toEqual([]);
  }, 30_000);

  it('el contador puede salirse por su cuenta', async () => {
    await como('contador').delete(`/miembros/${contador.usuarioId}`).expect(204);
    expect(await misEmpresas('contador')).toEqual([]);
  }, 30_000);
});
