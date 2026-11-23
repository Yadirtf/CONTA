# ADR-0002. Entorno de pruebas: API NestJS en Render, web y app en Cloudflare, base de datos en Neon

- Estado: Aceptado
- Fecha: 2026-11-23
- Historia: HU-01.06
- Decide: Inge

## Contexto
Inge definió que cada implementación se prueba antes de fusionarse, con Neon como base de datos y con `web/`, `api/` y `app/` separadas, cada una con su propia lógica. También pidió usar capas gratuitas. El plan original proponía NestJS con Redis/BullMQ, S3 y KMS en una nube administrada.

Restricciones duras: el dominio y la aplicación no dependen del proveedor; RLS por `empresa_id` sigue funcionando; los certificados nunca quedan en texto plano; cada PR se puede probar sin tocar los datos de otro; costo cero mientras se valida.

Solución obvia conocida: meter NestJS en un contenedor y desplegarlo igual que en cualquier nube.

## Alternativas consideradas para la API (Verbalized Sampling)

| # | Alternativa | Prob. verbalizada | Ronda | Resultado |
| - | ----------- | ----------------- | ----- | --------- |
| 1 | NestJS en Cloudflare Containers | 0,35 | completa | Descartada: no tiene capa gratuita para contenedores encendidos |
| 2 | API en Hono sobre Cloudflare Workers | 0,25 | completa | Descartada por Inge: cambia el framework del plan |
| 3 | **NestJS en Render, capa gratuita** | 0,20 | completa | **Elegida** |
| 4 | Hono en Workers + Container solo para firmar | 0,08 | cola | Descartada: dos runtimes para una persona |
| 5 | NestJS en Fly.io o Railway | 0,07 | cola | Descartada: sin capa gratuita estable equivalente |

Las probabilidades son la estimación del modelo, no una medida.

## Decisión

| Pieza | Dónde corre en pruebas | Costo |
| --- | --- | --- |
| `api/` (NestJS) | Render, servicio web gratuito `conta-api-develop`, desplegado desde `develop` | Gratis: 750 horas de instancia al mes por workspace |
| Vista previa de la API por PR | Vista previa de servicio de Render (PR preview), **solo cuando se pide** con la etiqueta `render-preview` | Mismo precio que el servicio base (gratis), pero gasta horas |
| Pruebas de la API por PR | GitHub Actions: levanta NestJS en el runner contra una rama de Neon `preview/pr-<n>` | Gratis |
| `web/consola` y `web/sitio` (Next.js) | Cloudflare Workers con OpenNext; versión de vista previa por PR | Gratis |
| `app/` (Flutter web) | Cloudflare Pages, una rama por PR | Gratis |
| Base de datos | Neon: rama `develop` estable, `preview` compartida por las vistas previas de Render, y `preview/pr-<n>` por PR para las pruebas | Gratis |
| Archivos (XML, PDF) | Cloudflare R2 (Render no tiene disco persistente en la capa gratuita) | Gratis hasta 10 GB |
| Colas | Se decide en HU-06.04 con VS. Candidatas: pg-boss sobre Neon o Redis administrado con capa gratuita. El Key Value gratuito de Render no sirve porque pierde los datos al reiniciar | — |
| Correo | API de correo por HTTPS; Render gratis bloquea los puertos SMTP | — |

## Lo que hay que saber de la capa gratuita de Render

Fuente: [render.com/docs/free](https://render.com/docs/free) y [render.com/docs/service-previews](https://render.com/docs/service-previews).

- Se **duerme tras 15 minutos** sin tráfico de entrada y tarda **cerca de 1 minuto** en despertar.
- **750 horas al mes por workspace**, compartidas entre el servicio y sus vistas previas. Si se acaban, Render **suspende todos** los servicios gratuitos hasta el mes siguiente.
- Sin disco persistente, puede reiniciarse en cualquier momento y no se debe usar para producción.
- Las vistas previas copian las variables del servicio base, incluida la conexión a la base de datos. Por eso la API elige `DATABASE_URL_PREVIEW` cuando Render marca `IS_PULL_REQUEST=true` (ver el documento del entorno de pruebas).
- Los ambientes de vista previa de varios servicios (Blueprints) exigen plan Pro; no se usan.

## Por qué la vista previa de Render es bajo pedido y no automática
Un servicio despierto todo el mes gasta unas 744 horas de las 750. Si además cada PR crea su vista previa automática, se agotan las horas y Render suspende la API de pruebas. Por eso las pruebas de cada PR corren en GitHub Actions (gratis) y la vista previa en Render solo se crea con la etiqueta `render-preview` cuando alguien necesita probar el cambio con las manos.

## Despertador opcional de 14 minutos
Para que la API no se duerma durante las pruebas, el Worker `herramientas/despertador/` de Cloudflare (Cron Triggers, gratis) llama a `GET /salud` cada 14 minutos, **solo en horario de pruebas**: de lunes a sábado, de 7 a. m. a 11 p. m. en hora de Colombia. Eso son unas 430 horas al mes y deja cerca de 300 para las vistas previas. Prenderlo las 24 horas no se recomienda porque deja sin horas a las vistas previas.

`/salud` no consulta la base de datos, para no mantener despierto el cómputo de Neon ni generar tráfico saliente que Render pueda considerar excesivo.

## Consecuencias
- La carpeta `backend/` del plan se llama `api/` y usa NestJS, como dice el plan.
- La regla de dependencia de CI prohíbe en `dominio/` y `aplicacion/` cualquier import de `@nestjs/*`, `@neondatabase/*` u otros SDK.
- Con Neon, la API se conecta con un rol sin `BYPASSRLS` que no es dueño de las tablas, y las tablas usan `FORCE ROW LEVEL SECURITY`.
- Con conexiones en pool, `app.empresa_id` se fija con `SET LOCAL` dentro de cada transacción.
- Para producción se revisa este ADR: Render pago, otra nube, o mantener Render con instancia paga para no dormir.
