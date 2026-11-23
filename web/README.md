# web/

Dos aplicaciones Next.js independientes:

- `consola/`: consola de administración para Inge y soporte (empresas, habilitación DIAN, certificados, pagos, métricas).
- `sitio/`: página de venta, precios, registro y pago con Wompi.

Solo presentación: toda regla fiscal o contable se pide a la API. El cliente de API se genera desde `../contratos/openapi.yaml`. No importa nada de `api/` ni de `app/`.

Pruebas en Cloudflare Workers (`conta-consola` y `conta-sitio`) con el adaptador OpenNext; la API de pruebas está en Render ([entorno de pruebas](../Docs/despliegue/entorno-de-pruebas.md)).

## Comandos (dentro de `consola/` o `sitio/`)

| Comando | Qué hace |
| --- | --- |
| `npm ci` | Instala las dependencias exactas |
| `npm run dev` | Next.js local en `http://localhost:3000` |
| `npm test` / `npm run tipos` | Pruebas (Vitest) y verificación de tipos |
| `npm run cf:preview` | Construye con OpenNext y lo corre en el runtime de Workers en local |

La consola muestra el estado de `GET /salud` de la API que recibe en `NEXT_PUBLIC_API_URL` al compilar.
