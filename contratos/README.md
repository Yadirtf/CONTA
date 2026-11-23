# contratos/

Datos que comparten `api/`, `web/` y `app/`. Ninguna aplicación importa código de otra; solo leen estos contratos.

| Archivo | Qué es | Cómo se actualiza |
| --- | --- | --- |
| `openapi.yaml` | Contrato de la API, generado por `api/`. De aquí se generan los clientes de API. | Lo regenera la API. No se edita a mano. |
| `diseno/tokens.json` | Sistema visual: colores claro y oscuro, pares de contraste AA, espacios, radios, alturas, tipografía y movimiento ([ADR-0009](../Docs/decisiones/0009-sistema-visual-y-tokens-compartidos.md), [guía](../Docs/producto/sistema-de-diseno.md)). | Se edita a mano y luego `node herramientas/diseno/tokens.mjs` desde la raíz. |
