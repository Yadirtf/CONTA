# Despertador de la API de pruebas

Worker de Cloudflare (Cron Triggers, gratis) que llama a `GET /salud` de la API en Render cada 14 minutos, de lunes a sábado, de 7 a. m. a 11 p. m. en hora de Colombia. Evita que la API de pruebas se duerma sin gastar todas las horas gratuitas de Render.

También hace `POST /interno/trabajos/procesar` con `Authorization: Bearer <TOKEN_TRABAJOS>`: recupera los envíos a la DIAN que quedaron en la cola si la API se reinició (ADR-0008). Si el secreto no está, el Worker solo despierta la API. Fuera del horario, la cola espera a la mañana siguiente o a la próxima petición que despierte la API.

- Token: el mismo valor (al menos 32 caracteres al azar, por ejemplo `openssl rand -hex 32`) va como `TOKEN_TRABAJOS_INTERNOS` en Render y en el entorno `SECRETOS` de GitHub; el job de despliegue lo copia al Worker como `TOKEN_TRABAJOS`.
- Se despliega solo desde GitHub Actions cuando un cambio en esta carpeta llega a `develop` (job `despertador` de `vista-previa.yml`). A mano: `npx wrangler deploy` en esta carpeta.
- Apagar: dejar `crons = []` en `wrangler.toml` y fusionar a `develop`, o `npx wrangler delete`.
- Cambiar horario: editar `crons` en `wrangler.toml` (en UTC).

Detalle y cuentas de horas en [entorno de pruebas](../../Docs/despliegue/entorno-de-pruebas.md#despertador-de-14-minutos-opcional).
