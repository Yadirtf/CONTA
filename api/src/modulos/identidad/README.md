# modulos/identidad

Entrar a CONTA con el celular y un código, sin contraseña (HU-04.01, [ADR-0010](../../../../Docs/decisiones/0010-acceso-con-celular-y-codigo-por-whatsapp.md)).

## Qué hay

| Capa | Contenido |
| --- | --- |
| `dominio/` | `Celular` (móvil colombiano en E.164, enmascarado fuera de la base), `AccesoPorCelular` (vencimiento, un solo uso, 5 fallos → 15 minutos de bloqueo, 1 minuto entre códigos, 5 por hora), `POLITICA_DE_ACCESO` (todos esos números en un solo lugar), `ErrorDeAcceso`, `Usuario` y `Sesion`. |
| `aplicacion/` | Comandos `SolicitarCodigo`, `VerificarCodigo` y `CerrarSesion`, y la consulta `SesionDelToken`. Puertos: `UnidadDeTrabajoDeIdentidad`, `EnviadorDeCodigos`, `GeneradorDeCodigos` y `HuellasDeAcceso`. |
| `infraestructura/persistencia/` | Repositorios sobre `conta_identidad` (migración `0003_identidad.sql`). La transacción no fija empresa. |
| `infraestructura/cripto/` | HMAC-SHA256 del código, token de 32 bytes y SHA-256 del token, con `node:crypto`. |
| `infraestructura/envio/` | `EnviadorWhatsAppCloud`. Lo envuelven `EnviadorConCelularesDePrueba` y `EnviadorConTope`; sin credenciales se usa `EnviadorSinCanal`. |
| `infraestructura/configuracion/` | Lee y valida las variables de entorno. Si algo es inseguro, la API no arranca. |
| `presentacion/http/` | `AccesoController` (`/acceso/...`), `GuardaDeSesion` con `@SesionDeLaPeticion()`, el límite por IP y `TraductorDeRechazos` (códigos estables y `Retry-After`). |

## Endpoints

| Método y ruta | Qué hace | Respuestas |
| --- | --- | --- |
| `POST /acceso/codigos` `{celular}` | Envía el código | 202, 400 celular inválido, 429 espera, límite o bloqueo, 503 canal caído |
| `POST /acceso/sesiones` `{celular, codigo}` | Verifica y abre sesión; la primera vez registra | 201, 400, 401 incorrecto (con `intentosRestantes`) o vencido, 429 bloqueado |
| `GET /acceso/yo` | Quién es la sesión | 200, 401 |
| `DELETE /acceso/sesiones/actual` | Cierra la sesión del dispositivo | 204, 401 |

## Para otros módulos

`index.ts` exporta `GuardaDeSesion`, `SesionDeLaPeticion`, `SesionVigente`, `SesionDelToken` y `tokenDeLaPeticion`. El módulo de empresas los usa para el resolutor de empresa por membresía (HU-04.02, [ADR-0011](../../../../Docs/decisiones/0011-pertenecer-a-varias-empresas.md)). `IdUsuario` vive en `compartido/dominio/` porque lo usan los dos módulos.
