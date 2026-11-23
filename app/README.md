# app/

App del cliente en Flutter: Android, iPhone y versión web, con el mismo código.

- Estructura: `lib/funcionalidades/<funcionalidad>/{dominio,datos,presentacion}` según [la arquitectura](../Docs/arquitectura/arquitectura-limpia.md#42-app-del-cliente-flutter).
- Contiene el modo sin internet y la cola de sincronización, pero nunca decide el estado DIAN.
- Sin precios, botones de pago ni enlaces a Wompi en la versión Android.
- El cliente de API se genera desde `../contratos/openapi.yaml`. No importa nada de `api/` ni de `web/`.

La versión web se prueba en Cloudflare Pages, proyecto `conta-app` ([entorno de pruebas](../Docs/despliegue/entorno-de-pruebas.md)).

## Comandos

Requiere Flutter 3.50.1 (fijado en `pubspec.yaml`, `environment.flutter`).

| Comando | Qué hace |
| --- | --- |
| `flutter pub get` | Instala dependencias |
| `flutter analyze` / `flutter test` | Análisis estático y pruebas |
| `dart run tool/reglas_de_dependencia.dart` | Reglas de capas y funcionalidades; falla con el nombre de la regla |
| `flutter run -d chrome --dart-define=API_URL=http://localhost:3000` | App web local contra la API local |
| `flutter build web --release --dart-define=API_URL=<url>` | Versión web, como en CI |

En CI, [`ci-app.yml`](../.github/workflows/ci-app.yml) corre `flutter analyze` (lint y tipos), reglas de dependencia y pruebas, solo cuando cambian `app/` o `contratos/`.
