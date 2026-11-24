import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configurarApp } from '../../src/configurar-app.js';
import { hayBase } from '../integracion/aislamiento/base-de-pruebas.js';

// HU-04.01 de punta a punta: pedir código, entrar, quién soy, salir y bloqueo tras 5 fallos.
// Usa celulares de prueba con código fijo (solo con CONTA_ENTORNO=pruebas): no se envía ningún mensaje.
// Los números son al azar en cada corrida para no chocar con corridas anteriores en la misma base.
const azar = () => `3${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
const CODIGO = '135790';
const quienEntra = azar();
const quienSeEquivoca = azar();

async function crearApp(): Promise<INestApplication> {
  process.env['CONTA_ENTORNO'] = 'pruebas';
  process.env['CELULARES_DE_PRUEBA'] = `${quienEntra}:${CODIGO},${quienSeEquivoca}:${CODIGO}`;
  try {
    const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    configurarApp(app);
    await app.init();
    return app;
  } finally {
    delete process.env['CONTA_ENTORNO'];
    delete process.env['CELULARES_DE_PRUEBA'];
  }
}

describe('acceso sin base (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await crearApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('un celular que no es de Colombia responde 400 con un código estable', async () => {
    const { body } = await request(app.getHttpServer()).post('/acceso/codigos').send({ celular: '6011234567' }).expect(400);
    expect(body).toMatchObject({ codigo: 'acceso.celular-invalido' });
  });

  it('un código mal escrito responde 400 sin contar como intento', async () => {
    await request(app.getHttpServer()).post('/acceso/sesiones').send({ celular: quienEntra, codigo: '12a' }).expect(400);
  });

  it('sin sesión, /acceso/yo responde 401', async () => {
    await request(app.getHttpServer()).get('/acceso/yo').expect(401);
    await request(app.getHttpServer()).get('/acceso/yo').set('Authorization', 'Bearer inventado').expect(401);
  });
});

describe.skipIf(!hayBase)('acceso con base (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await crearApp();
  });
  afterAll(async () => {
    await app.close();
  });
  const api = () => request(app.getHttpServer());

  it('pide el código, entra, sabe quién es y sale', async () => {
    const pedido = await api().post('/acceso/codigos').send({ celular: quienEntra }).expect(202);
    expect(new Date(pedido.body.venceEn as string).getTime() - Date.now()).toBeGreaterThan(9 * 60_000);
    expect(pedido.headers['cache-control']).toBe('no-store');

    const { body: sesion } = await api().post('/acceso/sesiones').send({ celular: quienEntra, codigo: CODIGO }).expect(201);
    expect(sesion).toMatchObject({ nuevo: true, usuario: { celular: `+57${quienEntra}` } });

    const autorizacion = `Bearer ${sesion.token as string}`;
    await api().get('/acceso/yo').set('Authorization', autorizacion).expect(200, sesion.usuario);
    await api().delete('/acceso/sesiones/actual').set('Authorization', autorizacion).expect(204);
    await api().get('/acceso/yo').set('Authorization', autorizacion).expect(401);
  });

  it('el mismo código no sirve dos veces y pedir otro enseguida pide esperar', async () => {
    await api().post('/acceso/sesiones').send({ celular: quienEntra, codigo: CODIGO }).expect(401);
    const { headers } = await api().post('/acceso/codigos').send({ celular: quienEntra }).expect(429);
    expect(Number(headers['retry-after'])).toBeGreaterThan(0);
  });

  it('tras 5 intentos fallidos el celular queda bloqueado 15 minutos, también para el código correcto', async () => {
    await api().post('/acceso/codigos').send({ celular: quienSeEquivoca }).expect(202);
    for (let restantes = 4; restantes >= 1; restantes--) {
      const { body } = await api().post('/acceso/sesiones').send({ celular: quienSeEquivoca, codigo: '000000' }).expect(401);
      expect(body).toMatchObject({ codigo: 'acceso.codigo-incorrecto', intentosRestantes: restantes });
    }
    const quinto = await api().post('/acceso/sesiones').send({ celular: quienSeEquivoca, codigo: '000000' }).expect(429);
    expect(quinto.body).toMatchObject({ codigo: 'acceso.bloqueado' });
    expect(Number(quinto.headers['retry-after'])).toBeGreaterThan(14 * 60);
    await api().post('/acceso/sesiones').send({ celular: quienSeEquivoca, codigo: CODIGO }).expect(429);
  });
});
