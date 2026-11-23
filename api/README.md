# api/

API única de CONTA en **NestJS**. Aquí viven **todas** las reglas del negocio: facturación DIAN, contabilidad, impuestos, caja, cartera, multiempresa, suscripciones y auditoría.

- Estructura: `src/modulos/<modulo>/{dominio,aplicacion,infraestructura,presentacion}` según [la arquitectura](../Docs/arquitectura/arquitectura-limpia.md#41-api).
- Pruebas: servicio gratuito de Render con Neon ([ADR-0002](../Docs/decisiones/0002-entorno-de-pruebas-render-cloudflare-neon.md)).
- Debe exponer `GET /salud` sin consultar la base de datos (lo usa el despertador).
- En vistas previas de Render (`IS_PULL_REQUEST=true`) usa `DATABASE_URL_PREVIEW`.
- Gestor de paquetes: npm (`package-lock.json`). Scripts que esperan el CI y Render: `build`, `start:prod`, `migrar`, `test`, `test:e2e`.
- Publica el contrato en `../contratos/openapi.yaml`.
- No importa nada de `web/` ni de `app/`.

## Comandos

Requiere Node 22 (`.node-version`) y npm 10.9 o superior.

| Comando | Qué hace |
| --- | --- |
| `npm ci` | Instala las dependencias exactas de `package-lock.json` |
| `npm run start:dev` | API local en `http://localhost:3000` (prueba `GET /salud`) |
| `npm test` | Pruebas unitarias (dominio y casos de uso, sin red ni base de datos) |
| `npm run dependencias` | Reglas de capas y módulos (dependency-cruiser); falla con el nombre de la regla |
| `npm run test:e2e` | Pruebas e2e de la API completa (en CI, contra la rama de Neon del PR) |
| `npm run build` / `npm run start:prod` | Compilar a `dist/` y arrancar como en Render |
| `npm run migrar` | Aplica `migraciones/*.sql` sobre `DATABASE_URL` (Drizzle, [ADR-0003](../Docs/decisiones/0003-drizzle-para-persistencia-y-migraciones.md)) |
| `npm run migracion:nueva -- <nombre>` | Crea una migración SQL vacía para escribir a mano (RLS, triggers, GRANT) |
| `npm run build && npm run contrato` | Regenera `../contratos/openapi.yaml` |

## Estructura

```
src/
  main.ts                   # arranque (puerto de Render, CORS)
  app.module.ts             # importa los módulos
  compartido/               # núcleo transversal: dominio, aplicacion (puertos), infraestructura, presentacion
  modulos/salud/            # módulo de ejemplo con las cuatro capas: GET /salud sin base de datos
migraciones/                # SQL versionado (registro en conta_sistema.migraciones)
scripts/                    # migrar.mjs, generar-contrato.mjs
test/e2e/                   # pruebas de la API completa
```
