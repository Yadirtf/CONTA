# app/

App del cliente en Flutter: Android, iPhone y versión web, con el mismo código.

- Estructura: `lib/funcionalidades/<funcionalidad>/{dominio,datos,presentacion}` según [la arquitectura](../Docs/arquitectura/arquitectura-limpia.md#42-app-del-cliente-flutter).
- Contiene el modo sin internet y la cola de sincronización, pero nunca decide el estado DIAN.
- Sin precios, botones de pago ni enlaces a Wompi en la versión Android.
- El cliente de API se genera desde `../contratos/openapi.yaml`. No importa nada de `api/` ni de `web/`.

La versión web se prueba en Cloudflare Pages ([entorno de pruebas](../Docs/despliegue/entorno-de-pruebas.md)). Se inicializa en la historia HU-01.01.
