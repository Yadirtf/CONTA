# Flujo de ramas, versiones y artefactos

## 1. Ramas

| Rama | Para qué es | Quién escribe | Se despliega en |
| --- | --- | --- | --- |
| `main` | Lo que está en producción. Cada versión se marca con una etiqueta `vX.Y.Z` | Solo por PR desde `develop` (o `hotfix/*`), aprobado por Inge | Producción (cuando exista) |
| `develop` | Integración: todo lo terminado que aún no es versión | Solo por PR desde ramas de trabajo | Entorno de pruebas estable en Cloudflare + rama `develop` de Neon |
| `hu/HU-xx.yy-descripcion-corta` | Una historia del backlog | Persona o agente asignado | Vista previa del PR |
| `fix/descripcion-corta` | Arreglo de algo que ya está en `develop` | Persona o agente asignado | Vista previa del PR |
| `hotfix/descripcion-corta` | Arreglo urgente de producción, sale de `main` | Persona o agente, con aprobación de Inge | Vista previa, luego producción |
| `claude/*` | Rama de una sesión de Claude; se trata igual que `hu/*` o `fix/*` | Agente | Vista previa del PR |

Reglas:
- **Una historia por rama y por PR.** El título del PR empieza con el id: `HU-06.01 Factura en 3 toques`.
- Todo PR de trabajo va **hacia `develop`**, nunca directo a `main`.
- El PR enlaza su issue con `Closes #<n>` para que el issue se cierre al fusionar.
- Nadie empuja directo a `main` ni a `develop`.
- Un `hotfix/*` se fusiona a `main` y de inmediato `main` se fusiona a `develop`.

## 2. Versiones

1. Cuando `develop` cumple una meta (o un conjunto de historias que vale la pena publicar), se abre un PR `develop → main` con título `Versión vX.Y.Z` y la lista de historias incluidas.
2. Inge aprueba y fusiona.
3. Se crea la etiqueta `vX.Y.Z` en `main` y una Release de GitHub con las notas. Los paquetes que se quieran guardar (APK, build web) se adjuntan a la Release, no se dejan como artefactos de Actions.
4. Versionado semántico: `X` cambio incompatible para clientes, `Y` funcionalidad nueva, `Z` arreglo.

## 3. Artefactos de GitHub Actions

Los artefactos de los workflows (builds, reportes de pruebas, capturas) **duran 2 días**. Lo que se conserva son las versiones.

- El workflow [`limpiar-artefactos.yml`](../../.github/workflows/limpiar-artefactos.yml) corre todos los días y borra los artefactos con más de 2 días.
- **No borra** los artefactos de ejecuciones de una etiqueta de versión (`v*`), ni los que se llamen `version-*`. Las Releases y etiquetas no son artefactos y nunca se tocan.
- Todo `actions/upload-artifact` del repositorio usa `retention-days: 2`, para que GitHub también los venza solo.
- Se puede correr a mano desde la pestaña Actions con otro número de días.
- Recomendado: en **Settings → Actions → General → Artifact and log retention**, poner 2 días como respaldo.

Nota: GitHub corre los workflows programados solo desde la rama por defecto (`main`). La limpieza diaria empieza cuando este workflow llega a `main` con la primera versión. Mientras tanto, los workflows del repositorio ya suben artefactos con `retention-days: 2`.

## 4. Protección de ramas (configurar en GitHub)

En **Settings → Branches** (o Rulesets), para `main` y `develop`:
- Exigir PR antes de fusionar.
- Exigir que pasen los checks de CI de la carpeta tocada (ver abajo).
- Bloquear el push forzado y el borrado de la rama.
- En `main`, exigir la aprobación de Inge.

### Workflows de CI por carpeta (HU-01.03)

| Workflow | Corre cuando cambia | Qué revisa |
| --- | --- | --- |
| `ci-api.yml` | `api/`, `contratos/` | Lint, tipos, reglas de dependencia, compilación, pruebas unitarias y de arquitectura, contrato OpenAPI al día |
| `ci-web.yml` | `web/`, `contratos/` | Lint, tipos, reglas de dependencia y pruebas de `consola/` y `sitio/` |
| `ci-app.yml` | `app/`, `contratos/` | `flutter analyze` (lint y tipos), reglas de dependencia y pruebas |
| `ci-repositorio.yml` | `.github/workflows/`, `herramientas/ci/` | Todo `upload-artifact` usa `retention-days: 2` |
| `vista-previa.yml` | Siempre (detecta la carpeta) | Pruebas e2e contra Neon y despliegues; no repite lo anterior |

Cada workflow corre también cuando cambia su propio archivo. Un PR que solo toca `web/` corre `ci-web.yml` (y `vista-previa.yml` para su vista previa), nunca `ci-app.yml` ni `ci-api.yml`.

Ojo al marcar checks como requeridos: GitHub deja **pendiente para siempre** un check requerido cuyo workflow no corrió por el filtro de carpetas, y el PR no se puede fusionar. Mientras el repositorio use la protección de ramas clásica, no marques como requeridos los checks de `ci-*.yml`; revisa que estén en verde antes de fusionar. Si más adelante se quiere exigirlos, se agrega un job agregador que corra siempre (o un ruleset de organización con *Require workflows to pass*).
