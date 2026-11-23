# api/

API única de CONTA. Aquí viven **todas** las reglas del negocio: facturación DIAN, contabilidad, impuestos, caja, cartera, multiempresa, suscripciones y auditoría.

- Estructura: `src/modulos/<modulo>/{dominio,aplicacion,infraestructura,presentacion}` según [la arquitectura](../Docs/arquitectura/arquitectura-limpia.md#41-api).
- Runtime de pruebas: Cloudflare Workers con Neon ([ADR-0002](../Docs/decisiones/0002-entorno-de-pruebas-cloudflare-y-neon.md)).
- Publica el contrato en `../contratos/openapi.yaml`.
- No importa nada de `web/` ni de `app/`.

Se inicializa en la historia HU-01.01.
