# api/

API única de CONTA en **NestJS**. Aquí viven **todas** las reglas del negocio: facturación DIAN, contabilidad, impuestos, caja, cartera, multiempresa, suscripciones y auditoría.

- Estructura: `src/modulos/<modulo>/{dominio,aplicacion,infraestructura,presentacion}` según [la arquitectura](../Docs/arquitectura/arquitectura-limpia.md#41-api).
- Pruebas: servicio gratuito de Render con Neon ([ADR-0002](../Docs/decisiones/0002-entorno-de-pruebas-render-cloudflare-neon.md)).
- Debe exponer `GET /salud` sin consultar la base de datos (lo usa el despertador).
- En vistas previas de Render (`IS_PULL_REQUEST=true`) usa `DATABASE_URL_PREVIEW`.
- Gestor de paquetes: npm (`package-lock.json`). Scripts que esperan el CI y Render: `build`, `start:prod`, `migrar`, `test`, `test:e2e`.
- Publica el contrato en `../contratos/openapi.yaml`.
- No importa nada de `web/` ni de `app/`.

Se inicializa en la historia HU-01.01.
