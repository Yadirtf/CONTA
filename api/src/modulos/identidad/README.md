# modulos/identidad

Entrar a CONTA con el celular y un código, sin contraseña (HU-04.01, [ADR-0010](../../../../Docs/decisiones/0010-acceso-con-celular-y-codigo-por-whatsapp.md)), y la verificación en dos pasos con una app autenticadora para quien trabaja como contador (HU-04.04, [ADR-0013](../../../../Docs/decisiones/0013-verificacion-en-dos-pasos.md)).

## Qué hay

| Capa | Contenido |
| --- | --- |
| `dominio/` | `Celular` (móvil colombiano en E.164, enmascarado fuera de la base), `AccesoPorCelular` (vencimiento, un solo uso, 5 fallos → 15 minutos de bloqueo, 1 minuto entre códigos, 5 por hora), `POLITICA_DE_ACCESO` (todos esos números en un solo lugar), `ErrorDeAcceso`, `Usuario` y `Sesion`. |
| `aplicacion/` | Comandos `SolicitarCodigo`, `VerificarCodigo` y `CerrarSesion`, y la consulta `SesionDelToken`. Puertos: `UnidadDeTrabajoDeIdentidad`, `EnviadorDeCodigos`, `GeneradorDeCodigos` y `HuellasDeAcceso`. |
| `infraestructura/persistencia/` | Repositorios sobre `conta_identidad` (migración `0003_identidad.sql`). La transacción no fija empresa. |
| `infraestructura/cripto/` | HMAC-SHA256 del código, token de 32 bytes y SHA-256 del token, con `node:crypto`. |
| `infraestructura/envio/` | `EnviadorWhatsAppCloud`. Lo envuelven `EnviadorConCelularesDePrueba` y `EnviadorConTope`; sin credenciales se usa `EnviadorSinCanal`. |
| `infraestructura/configuracion/` | Lee y valida las variables de entorno. Si algo es inseguro, la API no arranca. |
| `dominio/segundo-factor/` | `SegundoFactor` (inscripción pendiente y confirmada, anti-repetición por paso de tiempo, códigos de recuperación de un solo uso, 5 fallos → 15 minutos), `POLITICA_DE_SEGUNDO_FACTOR` y la vigencia en la sesión (una jornada). |
| `infraestructura/segundo-factor/` | TOTP de RFC 6238, base32, cifrado AES-256-GCM del secreto (con el id de la persona como dato asociado) y códigos de recuperación con HMAC, todo con `node:crypto`. Sin `SECRETO_SEGUNDO_FACTOR` se usa `SecretosSinClave`, que falla cerrado. |
| `presentacion/http/` | `AccesoController` (`/acceso/...`), `GuardaDeSesion` con `@SesionDeLaPeticion()`, el límite por IP y `TraductorDeRechazos` (códigos estables y `Retry-After`). |

## Endpoints

| Método y ruta | Qué hace | Respuestas |
| --- | --- | --- |
| `POST /acceso/codigos` `{celular}` | Envía el código | 202, 400 celular inválido, 429 espera, límite o bloqueo, 503 canal caído |
| `POST /acceso/sesiones` `{celular, codigo}` | Verifica y abre sesión; la primera vez registra | 201, 400, 401 incorrecto (con `intentosRestantes`) o vencido, 429 bloqueado |
| `GET /acceso/yo` | Quién es la sesión | 200, 401 |
| `DELETE /acceso/sesiones/actual` | Cierra la sesión del dispositivo | 204, 401 |
| `GET /acceso/segundo-factor` | Si la persona configuró su app y si la sesión está verificada | 200, 401 |
| `POST /acceso/segundo-factor/inscripcion` | Crea la clave de la app (QR y base32). Cambiar de app exige haber verificado hace 10 minutos o menos | 201, 409 ya inscrito, 429, 503 sin clave |
| `POST /acceso/segundo-factor/inscripcion/confirmacion` `{codigo}` | Confirma la app, verifica la sesión y entrega 10 códigos de recuperación | 201, 400, 409, 422 incorrecto, 429 bloqueado |
| `POST /acceso/segundo-factor/verificacion` `{codigo}` | Verifica la sesión una jornada con un código de la app o de recuperación | 201, 400, 409 sin app, 422 incorrecto o repetido, 429 bloqueado |

## Para otros módulos

`index.ts` exporta `GuardaDeSesion`, `SesionDeLaPeticion`, `SesionVigente`, `SesionDelToken` y `tokenDeLaPeticion`. También exporta `RegistrarPersona` (da el id de una persona por su celular y la registra si no existe; para invitar sin que haya entrado nunca) y `CelularesDePersonas` (celulares enmascarados de varios ids), que usa el módulo de empresas para gestionar personas (HU-04.03). El módulo de empresas los usa para el resolutor de empresa por membresía (HU-04.02, [ADR-0011](../../../../Docs/decisiones/0011-pertenecer-a-varias-empresas.md)). `IdUsuario` vive en `compartido/dominio/` porque lo usan los dos módulos. `SesionVigente` trae `segundoFactorVigente`, con el que el resolutor de empresa exige el segundo factor a quien trabaja como contador (HU-04.04); la regla `exigeSegundoFactor(rol, modo)` vive en `compartido/dominio/permisos/`.
