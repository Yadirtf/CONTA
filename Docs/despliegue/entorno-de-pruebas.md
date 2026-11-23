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

Orden recomendado: **Neon → Render → GitHub → Cloudflare**. Neon va primero porque Render necesita sus cadenas de conexión y deben quedar en la misma región.

### 4.1 Neon (base de datos)

1. Crear el proyecto `conta` en la región **AWS US East 1 (N. Virginia)**. Es la más cercana a Colombia y coincide con la región de Render del paso 4.2.
2. En **Branches**, crear dos ramas a partir de `main`: `develop` y `preview`.
3. Crear el rol `conta_app` en **Roles**. Las tablas no le pertenecen y no tiene `BYPASSRLS`, para que Row Level Security aplique siempre. Los permisos sobre las tablas se dan en la migración inicial (HU-01.05).
4. Copiar dos cadenas de conexión del rol `conta_app` con el botón **Connect**, marcando la opción *Pooled connection*: una de la rama `develop` y otra de la rama `preview`.
5. En **Settings**, copiar el *Project ID*. En la cuenta, **API keys**, crear una llave para GitHub.

### 4.2 Render: crear el servicio web, campo por campo

En Render: **New → Web Service → Yadirtf/CONTA**.

| Campo en Render | Valor | Por qué |
| --- | --- | --- |
| **Name** | `conta-api-develop` | Forma la URL `https://conta-api-develop.onrender.com`, que usan el workflow y el despertador. Si Render la cambia por estar ocupada, avisa la URL real |
| **Language** | `Node` | NestJS corre en Node |
| **Branch** | `develop` | Es el entorno estable de pruebas |
| **Region** | `Virginia (US East)` | La misma región que Neon; la API habla con la base en cada petición |
| **Root Directory** | `api` | La API vive en `api/`; los cambios en `web/` o `app/` no la redespliegan |
| **Build Command** | `npm ci && npm run build` | El proyecto usa npm (no yarn); compila NestJS a `dist/` |
| **Start Command** | `npm run start:prod` | Arranca la versión compilada (`node dist/main`) |
| **Compute** | `Free` ($0/mes) | Capa gratuita (ver sección 3) |
| **Environment Variables** | Ver la tabla de abajo | — |
| **Secret Files** | Ninguno | Los secretos van como variables |
| **Health Check Path** | `/salud` | Es la ruta de salud de la API; no consulta la base |
| **Pre-Deploy Command** | Vacío | En el plan gratuito está bloqueado (candado). Las migraciones corren en GitHub Actions antes del despliegue |
| **Auto-Deploy** | `Off` | El workflow despliega con el deploy hook **después** de migrar Neon. Con «After CI Checks Pass» Render desplegaría además por su cuenta y habría dos despliegues |
| **Build Filters** | Vacío | Con Root Directory `api` y Auto-Deploy apagado no hacen falta |

**Variables de entorno del servicio:**

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | Cadena *pooled* de Neon, rama `develop`, rol `conta_app` |
| `DATABASE_URL_PREVIEW` | Cadena *pooled* de Neon, rama `preview`, rol `conta_app` |
| `MASTER_KEY` | Botón **Generate** de Render (crea un valor aleatorio). Solo para pruebas |

No se pone `NODE_ENV=production` en Render: haría que `npm ci` omita las herramientas de compilación y el build fallaría. La API lo fija al arrancar.

**Antes de que exista el código (HU-01.01):** se puede crear el servicio desde ya. El primer despliegue va a **fallar** porque `api/` todavía no tiene `package.json`. Es lo esperado y no cuesta nada; lo importante es tener la URL y el deploy hook. Cuando se fusione HU-01.01, el workflow despliega solo.

**Después de crearlo, en el menú del servicio:**
1. **Settings → PR Previews**: elegir **Manual**. Así una vista previa solo se crea con la etiqueta `render-preview` en el PR.
2. **Settings → Deploy Hook**: copiar la URL (es secreta).

### 4.3 GitHub

En el repositorio: **Settings → Secrets and variables → Actions**. Los *secrets* van en la pestaña **Secrets** y las *variables* en la pestaña **Variables**.

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Secret | `RENDER_DEPLOY_HOOK_URL` | La URL del Deploy Hook de Render |
| Variable | `API_URL_DEVELOP` | `https://conta-api-develop.onrender.com` (o la URL real que dio Render) |
| Secret | `NEON_API_KEY` | La llave de API de Neon |
| Variable | `NEON_PROJECT_ID` | El Project ID de Neon |
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → plantilla «Edit Cloudflare Workers» + permiso de Pages |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → panel derecho |

### 4.4 Cloudflare

No hay que crear nada a mano: el workflow crea los recursos la primera vez. Como la cuenta se comparte con otro proyecto, todos llevan el prefijo `conta-`.

| Recurso | Tipo | URL estable (develop) | URL de un PR |
| --- | --- | --- | --- |
| `conta-consola` | Worker (OpenNext) | `https://conta-consola.<subdominio>.workers.dev` | `https://pr-<n>-conta-consola.<subdominio>.workers.dev` |
| `conta-sitio` | Worker (OpenNext) | `https://conta-sitio.<subdominio>.workers.dev` | `https://pr-<n>-conta-sitio.<subdominio>.workers.dev` |
| `conta-app` | Pages (Flutter web) | `https://conta-app.pages.dev` | `https://pr-<n>.conta-app.pages.dev` |

- `<subdominio>` es el subdominio `workers.dev` de la cuenta (Workers & Pages → panel derecho). Si la cuenta nunca lo eligió, hay que elegirlo una vez.
- Una versión de vista previa de un Worker exige que el Worker ya exista. Si el primer PR llega antes que el primer push a `develop`, el workflow hace un despliegue inicial y luego sube la vista previa.
- El proyecto de Pages `conta-app` se crea con `develop` como rama de producción.
- La API acepta llamadas del navegador solo desde estos orígenes (más `localhost`). Para otro origen se agrega en la variable `ORIGENES_PERMITIDOS` de Render, separada por comas.

El despertador se activa cuando la API ya responda `/salud`: `cd herramientas/despertador && npx wrangler deploy`.

Ninguno de estos valores va en el repositorio, en el texto de un PR ni en un chat.

## 5. Reglas del entorno de pruebas

- Solo datos de prueba. Nunca un NIT, certificado o cliente real en Render, en una vista previa ni en una rama de Neon de pruebas.
- La DIAN siempre en el **ambiente de habilitación** y Wompi en **sandbox**.
- Las migraciones corren en Actions sobre la rama de Neon antes de desplegar; si fallan, no se despliega.
- Las ramas de Neon de cada PR se borran al cerrar el PR, porque cuentan contra el límite de cómputo de la cuenta.
- Los artefactos de los builds duran 2 días (ver [flujo de ramas](../forma-de-trabajo/flujo-de-ramas.md#3-artefactos-de-github-actions)).
- Esto es un entorno de pruebas. Producción se decide en otro ADR.
