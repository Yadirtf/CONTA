# Entorno de pruebas: Render + Cloudflare + Neon

Cada implementación se prueba antes de fusionarse, usando solo capas gratuitas. La API (NestJS) corre en **Render**, la consola, el sitio y la app web en **Cloudflare**, y la base de datos en **Neon**. La decisión y sus alternativas están en el [ADR-0002](../decisiones/0002-entorno-de-pruebas-render-cloudflare-neon.md).

## 1. Carpetas y responsabilidades

Tres aplicaciones separadas, cada una con su propia lógica, sus dependencias y su pipeline. Ninguna importa código de otra: se hablan solo por la API HTTP, cuyo contrato vive en `contratos/openapi.yaml`.

| Carpeta | Qué es | Lógica que contiene | Lógica que **no** contiene | Dónde se prueba |
| --- | --- | --- | --- | --- |
| [`api/`](../../api/README.md) | API única en NestJS | Todas las reglas fiscales, contables, multiempresa y de pagos | Pantallas | Render (servicio gratuito) + Neon |
| [`web/`](../../web/README.md) | Consola de administración y sitio público (Next.js) | Presentación, formularios, navegación, autenticación de la consola | Cálculos fiscales o contables (los pide a la API) | Cloudflare Workers (OpenNext) |
| [`app/`](../../app/README.md) | App del cliente: Android, iPhone y web (Flutter) | Presentación, modo sin internet, cola de sincronización | Decidir el estado DIAN o numerar por su cuenta | Cloudflare Pages (versión web) |
| [`contratos/`](../../contratos/README.md) | `openapi.yaml` generado por la API | Solo el contrato | Código | — |
| `herramientas/despertador/` | Worker de Cloudflare con cron | Llamar a `/salud` cada 14 minutos en horario de pruebas | Nada del negocio | Cloudflare (Cron Triggers) |

## 2. Qué pasa en cada PR

```
PR abierto hacia develop
  ├─ api/ cambió
  │    ├─ Neon: crea la rama preview/pr-<n> desde develop
  │    ├─ Actions: migraciones + pruebas de integración y e2e de NestJS contra esa rama (gratis, en el runner)
  │    └─ Render: vista previa de la API solo si el PR tiene la etiqueta render-preview
  │         (URL conta-api-develop-pr-<n>.onrender.com, usa la rama "preview" de Neon)
  ├─ web/ cambió → versión de vista previa en Cloudflare con alias pr-<n>
  ├─ app/ cambió → Flutter web en Cloudflare Pages, rama pr-<n>
  │    (web y app apuntan a la vista previa de Render si existe; si no, a la API de develop)
  └─ comenta en el PR las URLs de prueba
PR fusionado o cerrado
  ├─ Neon: borra la rama preview/pr-<n>
  └─ Render: borra su vista previa sola
Push a develop
  ├─ api/: migraciones sobre la rama develop de Neon y luego deploy hook de Render
  ├─ web/ y app/: despliegue estable en Cloudflare
  └─ todo apunta a https://conta-api-develop.onrender.com
```

El workflow es [`vista-previa.yml`](../../.github/workflows/vista-previa.yml). Cada trabajo se salta solo mientras su carpeta no tenga proyecto (`package.json` o `pubspec.yaml`) o falte la configuración de la sección 4, así que no falla antes de tiempo.

## 3. Render: reglas de la capa gratuita

Fuente: [Deploy for Free](https://render.com/docs/free) y [Service Previews](https://render.com/docs/service-previews).

- **Se duerme** tras 15 minutos sin tráfico y tarda cerca de 1 minuto en despertar. La primera llamada después de un rato es lenta; es normal.
- **750 horas al mes por workspace**, compartidas por el servicio y sus vistas previas. Si se acaban, Render suspende todos los servicios gratuitos hasta el mes siguiente.
- **Sin disco persistente:** XML, PDF y adjuntos van a Cloudflare R2.
- **Sin SMTP:** los correos salen por una API HTTPS.
- **Puede reiniciarse en cualquier momento:** las colas no pueden vivir en memoria (ver HU-06.04).
- **Vistas previas:** bajo pedido con la etiqueta `render-preview` en el PR (o `[render preview]` en el título). Se borran solas al cerrar el PR.

### Base de datos de las vistas previas de Render
Una vista previa de Render copia las variables del servicio base. Para que no escriba en la base de `develop`, la configuración de la API hace:

```ts
// api/src/compartido/infraestructura/config/base-de-datos.ts
const esVistaPrevia = process.env.IS_PULL_REQUEST === 'true';
export const urlBaseDeDatos = esVistaPrevia
  ? process.env.DATABASE_URL_PREVIEW   // rama "preview" de Neon, compartida por las vistas previas
  : process.env.DATABASE_URL;          // rama "develop" de Neon
```

La rama `preview` de Neon se puede reiniciar desde `develop` cuando se ensucie.

### Despertador de 14 minutos (opcional)
`herramientas/despertador/` es un Worker de Cloudflare con un cron que llama a `GET /salud` cada 14 minutos de lunes a sábado, de 7 a. m. a 11 p. m. en hora de Colombia. Así la API no se duerme mientras se prueba y se gastan unas 430 horas al mes, dejando cerca de 300 para las vistas previas.

- Se activa desplegándolo una vez: `cd herramientas/despertador && npx wrangler deploy`.
- Se apaga con `npx wrangler delete`, o quitando el cron en `wrangler.toml`.
- No se recomienda dejarlo 24 horas: gastaría casi todas las horas del mes.
- `/salud` responde sin consultar la base de datos.

## 4. Configuración que tiene que hacer Inge (una sola vez)

**En Render:**
1. Crear el servicio web `conta-api-develop` desde este repositorio, rama `develop`, carpeta raíz `api`, tipo de instancia **Free**, con despliegue automático **apagado** (lo hace el workflow después de pasar las pruebas y migraciones).
2. Variables del servicio: `DATABASE_URL` (rama `develop` de Neon, rol `conta_app`), `DATABASE_URL_PREVIEW` (rama `preview` de Neon, rol `conta_app`), `MASTER_KEY` (llave de prueba de 32 bytes en base64).
3. En **Settings → PR Previews**, dejarlas en modo manual.
4. Copiar el **Deploy Hook** del servicio.

**En Neon:** crear el proyecto, las ramas `develop` y `preview` desde `main`, y el rol `conta_app` (sin `BYPASSRLS`, no dueño de las tablas).

**En GitHub, Settings → Secrets and variables → Actions:**

| Tipo | Nombre | De dónde sale |
| --- | --- | --- |
| Secret | `RENDER_DEPLOY_HOOK_URL` | Render → servicio → Settings → Deploy Hook |
| Variable | `API_URL_DEVELOP` | `https://conta-api-develop.onrender.com` |
| Secret | `NEON_API_KEY` | Neon → Account settings → API keys |
| Variable | `NEON_PROJECT_ID` | Neon → Project settings |
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → plantilla «Edit Cloudflare Workers» + permiso de Pages |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → panel derecho |

Ninguno de estos valores va en el repositorio ni en el texto de un PR.

## 5. Reglas del entorno de pruebas

- Solo datos de prueba. Nunca un NIT, certificado o cliente real en Render, en una vista previa ni en una rama de Neon de pruebas.
- La DIAN siempre en el **ambiente de habilitación** y Wompi en **sandbox**.
- Las migraciones corren en Actions sobre la rama de Neon antes de desplegar; si fallan, no se despliega.
- Las ramas de Neon de cada PR se borran al cerrar el PR, porque cuentan contra el límite de cómputo de la cuenta.
- Los artefactos de los builds duran 2 días (ver [flujo de ramas](../forma-de-trabajo/flujo-de-ramas.md#3-artefactos-de-github-actions)).
- Esto es un entorno de pruebas. Producción se decide en otro ADR.
