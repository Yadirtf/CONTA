import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configurarApp } from '../../src/configurar-app.js';

describe('GET /salud (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con estado ok y sin caché', async () => {
    const respuesta = await request(app.getHttpServer()).get('/salud').expect(200);
    expect(respuesta.body).toMatchObject({ estado: 'ok', servicio: 'conta-api' });
    expect(new Date(respuesta.body.hora).toString()).not.toBe('Invalid Date');
    expect(respuesta.headers['cache-control']).toBe('no-store');
  });

  it('permite llamar desde la vista previa de la consola en Cloudflare', async () => {
    const origen = 'https://pr-7-conta-consola.inge.workers.dev';
    const respuesta = await request(app.getHttpServer()).get('/salud').set('Origin', origen).expect(200);
    expect(respuesta.headers['access-control-allow-origin']).toBe(origen);
  });

  it('no permite orígenes ajenos', async () => {
    const respuesta = await request(app.getHttpServer()).get('/salud').set('Origin', 'https://panter.inge.workers.dev');
    expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
  });
});
