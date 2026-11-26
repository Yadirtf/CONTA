import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module.js';
import { configurarApp } from '../../../src/configurar-app.js';
import { codigoDeLaApp } from '../../apoyo/app-autenticadora.js';

// Apoyo de las pruebas e2e que necesitan personas con sesión (HU-04.02). Usa celulares de prueba con código
// fijo (solo con CONTA_ENTORNO=pruebas): no se envía ningún mensaje. Cada celular puede entrar una vez por
// minuto (POLITICA_DE_ACCESO), así que cada prueba reutiliza su sesión.

export const CODIGO_DE_PRUEBA = '135790';

/** Celular al azar en cada corrida, para no chocar con corridas anteriores en la misma base. */
export const celularAlAzar = (): string => `3${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

/** La API completa, con los celulares dados como celulares de prueba y, si hacen falta, módulos de prueba. */
export async function crearAppConCelulares(celulares: readonly string[], modulosDePrueba: Type[] = []): Promise<INestApplication> {
  process.env['CONTA_ENTORNO'] = 'pruebas';
  process.env['CELULARES_DE_PRUEBA'] = celulares.map((c) => `${c}:${CODIGO_DE_PRUEBA}`).join(',');
  // Clave de prueba del segundo factor (HU-04.04). La de verdad vive solo en el entorno de Render.
  process.env['SECRETO_SEGUNDO_FACTOR'] ??= 'clave-de-pruebas-del-segundo-factor-e2e';
  try {
    const app = (await Test.createTestingModule({ imports: [AppModule, ...modulosDePrueba] }).compile()).createNestApplication();
    configurarApp(app);
    await app.init();
    return app;
  } finally {
    delete process.env['CONTA_ENTORNO'];
    delete process.env['CELULARES_DE_PRUEBA'];
  }
}

/** Pide el código, entra y devuelve el valor del encabezado Authorization. */
export async function entrar(app: INestApplication, celular: string): Promise<string> {
  await request(app.getHttpServer()).post('/acceso/codigos').send({ celular }).expect(202);
  const { body } = await request(app.getHttpServer())
    .post('/acceso/sesiones')
    .send({ celular, codigo: CODIGO_DE_PRUEBA })
    .expect(201);
  return `Bearer ${(body as { token: string }).token}`;
}

/**
 * Configura la app autenticadora de la persona y deja verificada esa sesión (HU-04.04), como haría un contador
 * la primera vez. Devuelve la clave, para generar más códigos, y los códigos de recuperación.
 */
export async function pasarSegundoFactor(
  app: INestApplication,
  autorizacion: string,
): Promise<{ secreto: string; codigosDeRecuperacion: string[] }> {
  const { body: inscripcion } = await request(app.getHttpServer())
    .post('/acceso/segundo-factor/inscripcion')
    .set('Authorization', autorizacion)
    .expect(201);
  const secreto = (inscripcion as { secreto: string }).secreto;
  const { body } = await request(app.getHttpServer())
    .post('/acceso/segundo-factor/inscripcion/confirmacion')
    .set('Authorization', autorizacion)
    .send({ codigo: codigoDeLaApp(secreto, new Date()) })
    .expect(201);
  return { secreto, codigosDeRecuperacion: (body as { codigosDeRecuperacion: string[] }).codigosDeRecuperacion };
}
