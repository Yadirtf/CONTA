import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hayBase, nuevoId } from '../integracion/aislamiento/base-de-pruebas.js';
import { celularAlAzar, crearAppConCelulares, entrar } from './apoyo/app-con-sesiones.js';

// HU-04.02 de punta a punta: una persona con 3 empresas cambia de una a otra y solo ve la elegida.
// También cubre el criterio de HU-01.05: pedir un recurso de otra empresa responde 404, sin fuga.

interface EmpresaRespondida {
  id: string;
  razonSocial: string;
  rol: string;
  modo: string;
  estado: string;
  permisos: string[];
}

describe('empresas sin sesión (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await crearAppConCelulares([]);
  });
  afterAll(async () => {
    await app.close();
  });

  it('sin sesión, listar, crear y leer una empresa responden 401 aunque venga X-Empresa', async () => {
    const api = () => request(app.getHttpServer());
    await api().get('/empresas').expect(401);
    await api().post('/empresas').send({ razonSocial: 'Intrusa' }).expect(401);
    const { body } = await api().get(`/empresas/${nuevoId()}`).set('X-Empresa', nuevoId()).expect(401);
    expect(body).toMatchObject({ codigo: 'acceso.sin-sesion' });
  });
});

describe.skipIf(!hayBase)('pertenecer a varias empresas (e2e)', () => {
  const contador = celularAlAzar();
  const otraPersona = celularAlAzar();
  let app: INestApplication;
  let deContador: string;
  let deOtraPersona: string;
  let suyas: EmpresaRespondida[];
  let ajena: EmpresaRespondida;

  const api = () => request(app.getHttpServer());
  const crear = async (autorizacion: string, razonSocial: string) =>
    (await api().post('/empresas').set('Authorization', autorizacion).send({ razonSocial }).expect(201)).body as EmpresaRespondida;
  const leer = (autorizacion: string, elegida: string | null, id: string) => {
    const peticion = api().get(`/empresas/${id}`).set('Authorization', autorizacion);
    return elegida === null ? peticion : peticion.set('X-Empresa', elegida);
  };

  beforeAll(async () => {
    app = await crearAppConCelulares([contador, otraPersona]);
    deContador = await entrar(app, contador);
    deOtraPersona = await entrar(app, otraPersona);
    suyas = [
      await crear(deContador, 'Panadería La Espiga'),
      await crear(deContador, 'Ferretería El Tornillo'),
      await crear(deContador, 'Droguería Salud'),
    ];
    ajena = await crear(deOtraPersona, 'Miscelánea Ajena');
  });
  afterAll(async () => {
    await app.close();
  });

  it('lista sus 3 empresas por razón social, sin las de otra persona', async () => {
    const { body, headers } = await api().get('/empresas').set('Authorization', deContador).expect(200);
    expect(body).toEqual([...suyas].sort((x, y) => x.razonSocial.localeCompare(y.razonSocial)));
    expect(headers['cache-control']).toBe('no-store');
    const { body: deLaOtra } = await api().get('/empresas').set('Authorization', deOtraPersona).expect(200);
    expect(deLaOtra).toEqual([ajena]);
  });

  it('al cambiar de empresa, lo que ve es de la empresa elegida', async () => {
    for (const elegida of suyas) {
      const { body } = await leer(deContador, elegida.id, elegida.id).expect(200);
      expect(body).toEqual({ id: elegida.id, razonSocial: elegida.razonSocial });
      for (const otra of suyas.filter((e) => e.id !== elegida.id)) {
        await leer(deContador, elegida.id, otra.id).expect(404);
      }
    }
    // 9 peticiones con 3 transacciones cada una; contra Neon desde Actions pasan de los 5 s por defecto.
  }, 30_000);

  it('elegir una empresa ajena responde 404, igual que una inexistente o mal escrita', async () => {
    const deAjena = await leer(deContador, ajena.id, ajena.id).expect(404);
    const inexistente = await leer(deContador, nuevoId(), ajena.id).expect(404);
    const malEscrita = await leer(deContador, 'no-es-uuid', ajena.id).expect(404);
    expect(deAjena.body).toEqual(inexistente.body);
    expect(malEscrita.body).toEqual(inexistente.body);
    expect(JSON.stringify(deAjena.body)).not.toContain('Miscelánea');
  });

  it('sin X-Empresa responde 400 con un código estable', async () => {
    const { body } = await leer(deContador, null, suyas[0]!.id).expect(400);
    expect(body).toMatchObject({ codigo: 'empresa.sin-elegir' });
  });

  it('una razón social vacía no crea nada', async () => {
    const { body } = await api().post('/empresas').set('Authorization', deContador).send({ razonSocial: '   ' }).expect(400);
    expect(body).toMatchObject({ codigo: 'empresa.razon-social-invalida' });
    await api().post('/empresas').set('Authorization', deContador).send({}).expect(400);
    const { body: lista } = await api().get('/empresas').set('Authorization', deContador).expect(200);
    expect(lista).toHaveLength(3);
  });

  // Va de última: cierra la sesión que usan las demás.
  it('al cerrar sesión, la empresa deja de responder', async () => {
    await leer(deContador, suyas[0]!.id, suyas[0]!.id).expect(200);
    await api().delete('/acceso/sesiones/actual').set('Authorization', deContador).expect(204);
    await leer(deContador, suyas[0]!.id, suyas[0]!.id).expect(401);
  });
});
