// Genera ../contratos/openapi.yaml desde los controladores de la API (sin escuchar en un puerto).
// Requiere haber compilado antes: npm run build.
import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { stringify } from 'yaml';
import { AppModule } from '../dist/app.module.js';
import { documentoOpenApi } from '../dist/configurar-app.js';

const paquete = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')));
const app = await NestFactory.create(AppModule, { logger: false });
const documento = documentoOpenApi(app, paquete.version);
await writeFile(
  new URL('../../contratos/openapi.yaml', import.meta.url),
  `# Generado por api/ con "npm run build && npm run contrato". No se edita a mano.\n${stringify(documento)}`,
);
await app.close();
console.log('contratos/openapi.yaml actualizado.');
