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
| `npm run lint` | ESLint con las reglas de Next.js (Core Web Vitals) y TypeScript |
| `npm run dependencias` | Reglas de capas y funcionalidades (dependency-cruiser); falla con el nombre de la regla |
| `npm run cf:preview` | Construye con OpenNext y lo corre en el runtime de Workers en local |

En CI, [`ci-web.yml`](../.github/workflows/ci-web.yml) corre lint, tipos, dependencias y pruebas de los dos proyectos, solo cuando cambian `web/` o `contratos/`.

### Reglas de dependencia

`.dependency-cruiser.cjs` es igual en `consola/` y `sitio/` (sección 4.3 de la [arquitectura](../Docs/arquitectura/arquitectura-limpia.md)): el dominio de una funcionalidad es TypeScript puro y no usa `datos/` ni `ui/`; `datos/` no usa `ui/`; una funcionalidad no usa los `datos/` ni la `ui/` de otra; `compartido/` no conoce las funcionalidades. `test/arquitectura/` prueba cada regla con ejemplos que la rompen a propósito.

La consola muestra el estado de `GET /salud` de la API que recibe en `NEXT_PUBLIC_API_URL` al compilar.
