import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

// Orígenes que pueden llamar a la API desde el navegador (web/ y app/ en Cloudflare).
// Se configuran con ORIGENES_PERMITIDOS (separados por coma); por defecto, los Workers conta-* (incluidas
// sus vistas previas pr-<n>-conta-*) y Cloudflare Pages conta-app.
const ORIGENES_POR_DEFECTO = [
  /^https:\/\/([a-z0-9-]+-)?conta-[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/,
  // Pages puede añadir un sufijo al subdominio del proyecto (hoy conta-app-uka.pages.dev).
  /^https:\/\/([a-z0-9-]+\.)?conta-app(-[a-z0-9]+)?\.pages\.dev$/,
  /^http:\/\/localhost:\d+$/,
];

export function configurarApp(app: INestApplication): void {
  const extra = (process.env['ORIGENES_PERMITIDOS'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: [...ORIGENES_POR_DEFECTO, ...extra] });
  app.enableShutdownHooks();
  // No anunciar el framework en las respuestas.
  const servidor = app.getHttpAdapter().getInstance() as {
    disable?: (opcion: string) => void;
    set?: (opcion: string, valor: unknown) => void;
  };
  servidor.disable?.('x-powered-by');
  // Render pone un proxy delante: la IP real del cliente llega en X-Forwarded-For (límite por origen, HU-04.01).
  servidor.set?.('trust proxy', 1);
}

export function documentoOpenApi(app: INestApplication, version: string): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('CONTA API')
    .setDescription('API única de CONTA: facturación electrónica DIAN, contabilidad y multiempresa.')
    .setVersion(version)
    .build();
  return SwaggerModule.createDocument(app, config);
}
