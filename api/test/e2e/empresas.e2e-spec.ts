import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import type { UnidadDeTrabajo } from '../../src/compartido/aplicacion/index.js';
import { IdEmpresa } from '../../src/compartido/dominio/index.js';
import { RESOLUTOR_DE_EMPRESA } from '../../src/compartido/presentacion/empresa/index.js';
import { configurarApp } from '../../src/configurar-app.js';
import { Empresa, UNIDAD_DE_TRABAJO_EMPRESAS, type RepositoriosDeEmpresas } from '../../src/modulos/empresas/index.js';
import { hayBase, nuevoId } from '../integracion/aislamiento/base-de-pruebas.js';
import { ENCABEZADO_DE_PRUEBA, ResolutorDePrueba } from './apoyo/resolutor-de-prueba.js';

async function crearApp(conResolutorDePrueba: boolean): Promise<INestApplication> {
  let constructor = Test.createTestingModule({ imports: [AppModule] });
  if (conResolutorDePrueba) constructor = constructor.overrideProvider(RESOLUTOR_DE_EMPRESA).useClass(ResolutorDePrueba);
  const app = (await constructor.compile()).createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}

describe('GET /empresas/:id sin identidad (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await crearApp(false);
  });
  afterAll(async () => {
    await app.close();
  });

  it('responde 401 aunque llegue el encabezado de prueba: en producción nadie elige su empresa', async () => {
    await request(app.getHttpServer())
      .get(`/empresas/${nuevoId()}`)
      .set(ENCABEZADO_DE_PRUEBA, nuevoId())
      .expect(401);
  });
});

// Criterio de HU-01.05: un usuario de A que pide un recurso de B recibe 404, sin fuga.
describe.skipIf(!hayBase)('GET /empresas/:id entre empresas (e2e)', () => {
  let app: INestApplication;
  const a = IdEmpresa.de(nuevoId());
  const b = IdEmpresa.de(nuevoId());

  beforeAll(async () => {
    app = await crearApp(true);
    const uow = app.get<UnidadDeTrabajo<RepositoriosDeEmpresas>>(UNIDAD_DE_TRABAJO_EMPRESAS);
    await uow.ejecutar({ empresaId: a }, ({ empresas }) => empresas.guardar(Empresa.crear(a, 'Ferretería A')));
    await uow.ejecutar({ empresaId: b }, ({ empresas }) => empresas.guardar(Empresa.crear(b, 'Panadería B')));
  });
  afterAll(async () => {
    await app.close();
  });

  const pedir = (como: IdEmpresa | null, id: string) => {
    const r = request(app.getHttpServer()).get(`/empresas/${id}`);
    return como ? r.set(ENCABEZADO_DE_PRUEBA, como.valor) : r;
  };

  it('la empresa A ve sus datos', async () => {
    const respuesta = await pedir(a, a.valor).expect(200);
    expect(respuesta.body).toEqual({ id: a.valor, razonSocial: 'Ferretería A' });
    expect(respuesta.headers['cache-control']).toBe('no-store');
  });

  it('la empresa A pide la empresa B y recibe 404, igual que si no existiera', async () => {
    const deB = await pedir(a, b.valor).expect(404);
    const inexistente = await pedir(a, nuevoId()).expect(404);
    expect(deB.body).toEqual(inexistente.body);
    expect(JSON.stringify(deB.body)).not.toContain('Panadería');
  });

  it('sin empresa responde 401 y con un id que no es uuid responde 400', async () => {
    await pedir(null, a.valor).expect(401);
    await pedir(a, 'no-es-uuid').expect(400);
  });
});
