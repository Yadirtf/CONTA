# Entorno de pruebas: Cloudflare + Neon

Cada implementación se prueba en Cloudflare antes de fusionarse, con su propia base de datos en Neon. La decisión y sus alternativas están en el [ADR-0002](../decisiones/0002-entorno-de-pruebas-cloudflare-y-neon.md).

## 1. Carpetas y responsabilidades

Tres aplicaciones separadas, cada una con su propia lógica, sus dependencias y su pipeline. Ninguna importa código de otra: se hablan solo por la API HTTP, cuyo contrato vive en `contratos/openapi.yaml`.

| Carpeta | Qué es | Lógica que contiene | Lógica que **no** contiene | Dónde se prueba |
| --- | --- | --- | --- | --- |
| [`api/`](../../api/README.md) | API única (TypeScript) | Todas las reglas fiscales, contables, multiempresa y de pagos | Pantallas | Cloudflare Workers + rama de Neon |
| [`web/`](../../web/README.md) | Consola de administración y sitio público (Next.js) | Presentación, formularios, navegación, autenticación de la consola | Cálculos fiscales o contables (los pide a la API) | Cloudflare Workers (OpenNext) |
| [`app/`](../../app/README.md) | App del cliente: Android, iPhone y web (Flutter) | Presentación, modo sin internet, cola de sincronización | Decidir el estado DIAN o numerar por su cuenta | Cloudflare Pages (versión web) |
| [`contratos/`](../../contratos/README.md) | `openapi.yaml` generado por la API | Solo el contrato | Código | — |

## 2. Qué pasa en cada PR

```
PR abierto hacia develop
  ├─ Neon: crea la rama preview/pr-<n> desde develop (datos de prueba, nunca reales)
  ├─ api/  cambió → despliega el Worker conta-api-pr-<n> con DATABASE_URL de esa rama
  ├─ web/  cambió → sube una versión de vista previa con alias pr-<n>, apuntando a la API del PR
  ├─ app/  cambió → despliega Flutter web en Pages, rama pr-<n>
  └─ comenta en el PR las URLs de prueba
PR fusionado o cerrado
  ├─ Neon: borra la rama preview/pr-<n>
  └─ Cloudflare: borra el Worker conta-api-pr-<n>
Push a develop
  └─ despliega las tres carpetas en el entorno estable de pruebas, con la rama develop de Neon
```

El workflow es [`vista-previa.yml`](../../.github/workflows/vista-previa.yml). Cada trabajo se salta solo mientras su carpeta no tenga proyecto (`package.json` o `pubspec.yaml`) o mientras falte la configuración de la sección 3, así que no falla antes de tiempo.

## 3. Configuración que tiene que hacer Inge (una sola vez)

En **Settings → Secrets and variables → Actions** del repositorio:

| Tipo | Nombre | De dónde sale |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → plantilla «Edit Cloudflare Workers» + permiso de Pages |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → panel derecho |
| Variable | `CLOUDFLARE_SUBDOMINIO` | El subdominio `*.workers.dev` de la cuenta |
| Secret | `NEON_API_KEY` | Neon → Account settings → API keys |
| Variable | `NEON_PROJECT_ID` | Neon → Project settings |
| Secret | `MASTER_KEY_PRUEBAS` | Llave aleatoria de 32 bytes en base64 para cifrar certificados de prueba |

En Neon: crear el proyecto, la rama `develop` desde `main` y el rol `conta_app` (sin `BYPASSRLS`, no dueño de las tablas). La cadena de conexión que usa la API es la de ese rol.

Ninguno de estos valores va en el repositorio ni en el texto de un PR.

## 4. Reglas del entorno de pruebas

- Solo datos de prueba. Nunca un NIT, certificado o cliente real en una rama de vista previa.
- La DIAN siempre en el **ambiente de habilitación** y Wompi en **sandbox**.
- Las migraciones corren sobre la rama de Neon del PR antes de desplegar la API; si fallan, no se despliega.
- Las ramas de vista previa cuentan contra el límite de cómputo activo de Neon; por eso se borran al cerrar el PR.
- Los artefactos de los builds duran 2 días (ver [flujo de ramas](../forma-de-trabajo/flujo-de-ramas.md#3-artefactos-de-github-actions)).
