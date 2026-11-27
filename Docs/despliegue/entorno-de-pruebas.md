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

El workflow es [`vista-previa.yml`](../../.github/workflows/vista-previa.yml). También se puede correr a mano (**Actions → Vista previa → Run workflow** sobre `develop`) para desplegar todo `develop`; GitHub muestra ese botón solo cuando el workflow ya está en `main`. Además, un PR o push que cambia `vista-previa.yml` prueba y despliega las tres carpetas. Cada trabajo se salta solo mientras su carpeta no tenga proyecto (`package.json` o `pubspec.yaml`) o falte la configuración de la sección 4, así que no falla antes de tiempo.

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

- Está **activo** desde el 2026-11-23. El workflow lo despliega (Worker `conta-despertador`) cada vez que un cambio en su carpeta llega a `develop`.
- Se apaga dejando `crons = []` en `wrangler.toml` y fusionando a `develop`, o con `npx wrangler delete`.
- La capa gratuita de Cloudflare permite pocos cron triggers por cuenta y esta cuenta se comparte con `panter`. El despertador usa 2.
- No se recomienda dejarlo 24 horas: gastaría casi todas las horas del mes.
- `/salud` responde sin consultar la base de datos.

## 4. Configuración que tiene que hacer Inge (una sola vez)

Orden recomendado: **Neon → Render → GitHub → Cloudflare**. Neon va primero porque Render necesita sus cadenas de conexión y deben quedar en la misma región.

### 4.1 Neon (base de datos)

1. Crear el proyecto `conta` en la región **AWS US East 1 (N. Virginia)**. Es la más cercana a Colombia y coincide con la región de Render del paso 4.2.
2. En **Branches**, crear dos ramas a partir de `main`: `develop` y `preview`.
3. Crear el rol `conta_app` en **Roles**. Es el rol **dueño**: corre las migraciones y es dueño de las tablas. Neon le da `BYPASSRLS` y no deja quitárselo, por eso la API no lo usa.
   Luego crear el rol de la API, `conta_api`, **por SQL**: así nace sin `BYPASSRLS` y sin ser dueño de nada, y Row Level Security le aplica siempre. En el SQL Editor, con `neondb_owner`, en las ramas `develop` y `preview` (y en cada `preview/pr-<n>` que ya exista), con la misma contraseña larga y aleatoria:
   ```sql
   CREATE ROLE conta_api LOGIN PASSWORD '<contraseña>';
   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'conta_api';  -- debe decir f
   ```
   Las ramas nuevas copian el rol de su madre. La contraseña va solo al secret `NEON_CONTA_API_PASSWORD` (sección 4.3) y a las cadenas de Render; nunca a un chat ni al repositorio. Los permisos sobre las tablas los da la migración de cada tabla (HU-01.05).
4. Copiar dos cadenas de conexión con el botón **Connect**, marcando la opción *Pooled connection*: una de la rama `develop` y otra de la rama `preview`. En cada una, cambiar el usuario y la contraseña por `conta_api` y su contraseña (`postgresql://conta_api:<contraseña>@...`); si la contraseña tiene símbolos, van codificados (`@` → `%40`).
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
| `DATABASE_URL` | Cadena *pooled* de Neon, rama `develop`, rol `conta_api` |
| `DATABASE_URL_PREVIEW` | Cadena *pooled* de Neon, rama `preview`, rol `conta_api` |
| `MASTER_KEY` | Botón **Generate** de Render (crea un valor aleatorio). Solo para pruebas |
| `TOKEN_TRABAJOS_INTERNOS` | Al menos 32 caracteres al azar (`openssl rand -hex 32`). El mismo valor va en GitHub (4.3). Protege `POST /interno/trabajos/procesar` ([ADR-0008](../decisiones/0008-envio-dian-con-cola-en-tabla-y-despertador.md)) |
| `DIAN_HAB_EMPRESA_ID` | Opcional. Id de la única empresa que puede enviar a habilitación mientras llega HU-07.02 |
| `DIAN_HAB_P12_BASE64`, `DIAN_HAB_P12_CONTRASENA`, `DIAN_HAB_TEST_SET_ID` | Opcionales. Certificado de habilitación en base64, su contraseña y el TestSetId del set de pruebas |
| `DIAN_HAB_ID_SOFTWARE`, `DIAN_HAB_PIN`, `DIAN_HAB_NIT` | Opcionales. Id y PIN del software registrado en habilitación y NIT del facturador (sin dígito). Con `DIAN_HAB_EMPRESA_ID`, dejan vender a esa empresa (HU-06.01); cualquier otra responde «Tu negocio todavía no está listo para facturar» |
| `DIAN_HAB_CLAVE_TECNICA` | Opcional. Clave técnica del rango; por defecto, la pública del set de pruebas de habilitación |
| `SECRETO_CODIGOS_ACCESO` | Al menos 32 caracteres al azar (`openssl rand -hex 32`). Firma los códigos de acceso ([ADR-0010](../decisiones/0010-acceso-con-celular-y-codigo-por-whatsapp.md)). Sin él, la API usa uno al azar por proceso y los códigos pendientes se pierden al reiniciar |
| `SECRETO_SEGUNDO_FACTOR` | Al menos 32 caracteres al azar (`openssl rand -hex 32`), distinto de los demás. Cifra los secretos de las apps de verificación y firma los códigos de recuperación ([ADR-0013](../decisiones/0013-verificacion-en-dos-pasos.md)). Sin él, nadie con rol o modo contador puede trabajar en una empresa (503). Guarda una copia fuera de Render: si se pierde, cada contador debe configurar su app de nuevo |
| `CONTA_ENTORNO` | `pruebas`. Es lo único que permite `CELULARES_DE_PRUEBA` |
| `CELULARES_DE_PRUEBA` | Opcional, solo en pruebas. Pares `celular:código` separados por coma (ejemplo: `3000000001:<6 dígitos>`). A esos números no se les envía nada y entran con su código fijo. Usa números que no sean de nadie |
| `WHATSAPP_TOKEN`, `WHATSAPP_ID_NUMERO` | Opcionales. Token de acceso y id del número de WhatsApp Cloud API (Meta). Sin ellos, pedir un código a un número real responde 503 |
| `WHATSAPP_PLANTILLA_CODIGO`, `WHATSAPP_IDIOMA` | Opcionales. Nombre de la plantilla de autenticación aprobada (por defecto `codigo_de_acceso`) y su idioma (por defecto `es`) |
| `ACCESO_ENVIOS_POR_HORA` | Opcional. Tope de códigos por hora para todo CONTA (por defecto 200) |

No se pone `NODE_ENV=production` en Render: haría que `npm ci` omita las herramientas de compilación y el build fallaría. La API lo fija al arrancar.

**Antes de que exista el código (HU-01.01):** se puede crear el servicio desde ya. El primer despliegue va a **fallar** porque `api/` todavía no tiene `package.json`. Es lo esperado y no cuesta nada; lo importante es tener la URL y el deploy hook. Cuando se fusione HU-01.01, el workflow despliega solo.

**Después de crearlo, en el menú del servicio:**
1. **Settings → PR Previews**: elegir **Manual**. Así una vista previa solo se crea con la etiqueta `render-preview` en el PR.
2. **Settings → Deploy Hook**: copiar la URL (es secreta).

### 4.3 GitHub

En el repositorio: **Settings → Environments → SECRETOS**, en sus secciones *Environment secrets* y *Environment variables*. El workflow declara `environment: SECRETOS` en cada job que los usa y pasa a los demás solo lo que no es secreto.

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Secret | `RENDER_DEPLOY_HOOK_URL` | La URL del Deploy Hook de Render |
| Variable | `API_URL_DEVELOP` | `https://conta-api-develop.onrender.com` (o la URL real que dio Render) |
| Secret | `NEON_API_KEY` | La llave de API de Neon |
| Variable | `NEON_PROJECT_ID` | El Project ID de Neon |
| Secret | `NEON_CONTA_API_PASSWORD` | La contraseña del rol `conta_api` (sección 4.1, paso 3) |
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → plantilla «Edit Cloudflare Workers» + permiso de Pages |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → panel derecho |
| Secret | `TOKEN_TRABAJOS_INTERNOS` | El mismo de Render. El job `despertador` lo copia al Worker como `TOKEN_TRABAJOS` |
| Secret | `DIAN_HAB_P12_BASE64` | El .p12 de habilitación en base64 (`base64 -w0 certificado.p12`) |
| Secret | `DIAN_HAB_P12_CONTRASENA` | Su contraseña |
| Secret | `DIAN_HAB_TEST_SET_ID` | TestSetId que da el portal de habilitación de la DIAN |
| Secret | `DIAN_HAB_ID_SOFTWARE` y `DIAN_HAB_PIN` | Id y PIN del software registrado en habilitación |
| Variable | `DIAN_HAB_NIT` | NIT del facturador, sin dígito de verificación |

Los `DIAN_HAB_*` solo los usa el workflow manual **Habilitación DIAN** (Actions → Habilitación DIAN → Run workflow), que envía una factura real al set de pruebas.

### 4.4 Cloudflare

No hay que crear nada a mano: el workflow crea los recursos la primera vez. Como la cuenta se comparte con otro proyecto, todos llevan el prefijo `conta-`.

| Recurso | Tipo | URL estable (develop) | URL de un PR |
| --- | --- | --- | --- |
| `conta-consola` | Worker (OpenNext) | `https://conta-consola.<subdominio>.workers.dev` | `https://pr-<n>-conta-consola.<subdominio>.workers.dev` |
| `conta-sitio` | Worker (OpenNext) | `https://conta-sitio.<subdominio>.workers.dev` | `https://pr-<n>-conta-sitio.<subdominio>.workers.dev` |
| `conta-app` | Pages (Flutter web) | `https://conta-app-uka.pages.dev` | `https://pr-<n>.conta-app-uka.pages.dev` |

- `<subdominio>` es el subdominio `workers.dev` de la cuenta; hoy es `panter`, porque la cuenta se comparte con ese proyecto.
- Cloudflare le añadió el sufijo `-uka` al subdominio de Pages porque `conta-app.pages.dev` ya estaba tomado. El workflow lee la URL real de la salida de wrangler.
- Una versión de vista previa de un Worker exige que el Worker ya exista. Si el primer PR llega antes que el primer push a `develop`, el workflow hace un despliegue inicial y luego sube la vista previa.
- El proyecto de Pages `conta-app` se crea con `develop` como rama de producción.
- La API acepta llamadas del navegador solo desde estos orígenes (más `localhost`). Para otro origen se agrega en la variable `ORIGENES_PERMITIDOS` de Render, separada por comas.

El despertador se despliega desde el workflow (ver la sección 3).

Ninguno de estos valores va en el repositorio, en el texto de un PR ni en un chat.

### 4.5 WhatsApp para los códigos de acceso (HU-04.01)

Mientras no esté listo, la app de pruebas entra con los celulares de `CELULARES_DE_PRUEBA` (sección 4.2). Para enviar códigos reales, sigue la [guía de WhatsApp para los códigos de acceso](whatsapp-codigos-de-acceso.md). En resumen:
1. Crear la app de Meta.
2. Aprobar la plantilla de autenticación `codigo_de_acceso` en español.
3. Generar un token permanente con un usuario del sistema.
4. Poner `WHATSAPP_TOKEN` y `WHATSAPP_ID_NUMERO` en Render.

### 4.6 Dejar una empresa lista para vender (HU-06.01)

Mientras llega el asistente de habilitación (EP-07), los datos fiscales y la resolución de numeración se cargan una vez con un comando, como `conta_app` (la API solo puede leerlos):

1. En la app, crea la empresa y copia su id (o léelo en Neon, tabla `conta.empresas`).
2. Escribe un JSON **fuera del repositorio** con el NIT, la razón social, la dirección y la resolución (la forma está al comienzo de `api/scripts/configurar-facturacion.mjs`). Para habilitación sirve la resolución de pruebas: prefijo `SETP`, del 990000000 al 995000000.
3. Corre `cd api && DATABASE_URL="<cadena de Neon con conta_app>" npm run facturacion:configurar -- /ruta/al/archivo.json`.
4. En Render pon `DIAN_HAB_EMPRESA_ID` con ese id, más `DIAN_HAB_ID_SOFTWARE`, `DIAN_HAB_PIN`, `DIAN_HAB_NIT` y el certificado (4.2), y reinicia.

Repetir el comando actualiza los datos fiscales. Una resolución guardada nunca cambia: para otro rango, agrega una nueva con otro id.

## 5. Reglas del entorno de pruebas

- Solo datos de prueba. Nunca un NIT, certificado o cliente real en Render, en una vista previa ni en una rama de Neon de pruebas.
- La DIAN siempre en el **ambiente de habilitación** y Wompi en **sandbox**.
- Las migraciones corren en Actions sobre la rama de Neon antes de desplegar; si fallan, no se despliega.
- En cada PR que cambia `api/`, la prueba [`rol-de-la-api.int-spec.ts`](../../api/test/integracion/rol-de-la-api.int-spec.ts) corre contra la rama `preview/pr-<n>` y falla si el rol `conta_app` es superusuario o tiene `BYPASSRLS`, o si Row Level Security deja ver filas sin `app.empresa_id` o de otra empresa. La acción de Neon entrega la cadena de `conta_app` (dueño); CI cambia usuario y contraseña por los de `conta_api` con `api/scripts/url-con-rol.mjs` antes de las pruebas. Si falla por el rol, revisar que `conta_api` exista en la rama y que la API no esté usando `conta_app`. Con Neon configurado no se puede saltar.
- En el mismo paso corren las pruebas de aislamiento de HU-01.05 ([`test/integracion/aislamiento/`](../../api/test/integracion/aislamiento/)): la de catálogo revisa que toda tabla de negocio tenga RLS forzado, política, FK e índices únicos con `empresa_id` y su prueba de comportamiento registrada; ver [Multiempresa](../arquitectura/multiempresa.md). La migración `0001` exige que `conta_api` exista en la rama antes de migrar.
- Las tablas de negocio viven en el esquema `conta`, que crea `conta_app`; en Neon `conta_app` no puede crear tablas en `public` (su dueño es `neondb_owner`).
- Para correrlas en local hace falta un PostgreSQL con los roles `conta_app` (dueño, migra) y `conta_api` (sin `BYPASSRLS`): `DATABASE_URL=<url de conta_app> npm run migrar` y luego `DATABASE_URL=<url de conta_api> npm run test:e2e`.
- Las ramas de Neon de cada PR se borran al cerrar el PR, porque cuentan contra el límite de cómputo de la cuenta.
- Los artefactos de los builds duran 2 días (ver [flujo de ramas](../forma-de-trabajo/flujo-de-ramas.md#3-artefactos-de-github-actions)).
- Esto es un entorno de pruebas. Producción se decide en otro ADR.
