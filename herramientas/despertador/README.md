# Despertador de la API de pruebas

Worker de Cloudflare (Cron Triggers, gratis) que llama a `GET /salud` de la API en Render cada 14 minutos, de lunes a sábado, de 7 a. m. a 11 p. m. en hora de Colombia. Evita que la API de pruebas se duerma sin gastar todas las horas gratuitas de Render.

- Activar: `npx wrangler deploy` en esta carpeta.
- Apagar: `npx wrangler delete`.
- Cambiar horario: editar `crons` en `wrangler.toml` (en UTC).

Detalle y cuentas de horas en [entorno de pruebas](../../Docs/despliegue/entorno-de-pruebas.md#despertador-de-14-minutos-opcional).
