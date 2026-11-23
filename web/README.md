# web/

Dos aplicaciones Next.js independientes:

- `consola/`: consola de administración para Inge y soporte (empresas, habilitación DIAN, certificados, pagos, métricas).
- `sitio/`: página de venta, precios, registro y pago con Wompi.

Solo presentación: toda regla fiscal o contable se pide a la API. El cliente de API se genera desde `../contratos/openapi.yaml`. No importa nada de `api/` ni de `app/`.

Pruebas en Cloudflare Workers con el adaptador OpenNext; la API de pruebas está en Render ([entorno de pruebas](../Docs/despliegue/entorno-de-pruebas.md)). Se inicializa en la historia HU-01.01.
