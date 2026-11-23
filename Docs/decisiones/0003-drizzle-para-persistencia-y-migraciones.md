# ADR-0003. Drizzle ORM y migraciones SQL versionadas para la API

- Estado: Propuesto (empate técnico; lo decide Inge)
- Fecha: 2026-11-23
- Historia: HU-01.01
- Decide: Inge

## Contexto
La API (NestJS, Node 22) habla con PostgreSQL en Neon por conexión *pooled* y debe aplicar migraciones desde GitHub Actions (`npm run migrar`) antes del deploy hook de Render.

Restricciones duras:
- Dominio y aplicación no importan el ORM; solo infraestructura.
- Dinero exacto: `numeric` llega como texto o decimal exacto, nunca como `number`.
- Cada transacción fija la empresa con `select set_config('app.empresa_id', $1, true)`. `SET LOCAL` no acepta parámetros. Las tablas usan `FORCE ROW LEVEL SECURITY` y el rol `conta_app` no tiene `BYPASSRLS`.
- Neon *pooled* (PgBouncer en modo transacción): nada de estado de sesión entre transacciones.
- Las políticas RLS, los triggers de inmutabilidad y los GRANT se escriben en SQL.
- Render gratis (512 MB) y una sola persona mantiene todo.

Solución obvia conocida: Prisma con `prisma migrate`.

## Alternativas consideradas (Verbalized Sampling)
Las generó el hilo de HU-01.01 y las evaluó otro agente. Las probabilidades son la estimación del modelo, no una medida.

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado | Resultado |
| - | ----------- | ----------------- | ----- | ----------------- | --------- |
| 1 | Prisma + prisma migrate | 0,32 | completa | 3,30 | Descartada: lenguaje de esquema propio y migraciones atadas a la herramienta |
| 2 | TypeORM | 0,24 | completa | 2,60 | Descartada: los decoradores invitan a acoplar el dominio y tiene mucha magia |
| 3 | **Drizzle + drizzle-kit** | 0,20 | completa | **4,35** | **Recomendada** |
| 4 | Kysely + migrador | 0,14 | completa | 4,25 | Empate técnico con 3 |
| 5 | MikroORM | 0,10 | completa | 2,75 | Descartada: curva y Unit of Work excesivos para una persona |
| 6 | `pg` + node-pg-migrate (.sql) | 0,07 | cola | 4,00 | Aporta la idea de migraciones SQL planas |
| 7 | PgTyped + node-pg-migrate | 0,05 | cola | 3,40 | Descartada: necesita la base para generar tipos |
| 8 | Slonik | 0,04 | cola | 3,30 | Descartada: convierte `numeric` a float por defecto |
| 9 | Atlas o graphile-migrate + Kysely | 0,04 | cola | 3,85 | Variante de 4; Atlas cobra por RLS y triggers (sin verificar) |
| 10 | postgres.js con tipos generados | 0,03 | cola | 3,30 | Descartada: sentencias con nombre por defecto y herramientas poco conocidas |

## Criterios y evaluación
C1 cambiar la tecnología después (25 %), C2 simplicidad para una persona (25 %), C3 probar sin red ni base (20 %), C4 costo operativo (15 %), C5 tiempo para tenerla funcionando (15 %).

| Alternativa | C1 | C2 | C3 | C4 | C5 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| 3 Drizzle | 4 | 4 | 5 | 5 | 4 | 4,35 |
| 4 Kysely | 5 | 4 | 4 | 5 | 3 | 4,25 |
| 6 `pg` puro | 5 | 3 | 4 | 5 | 3 | 4,00 |
| 9 SQL primero + Kysely | 5 | 3 | 4 | 4 | 3 | 3,85 |

La diferencia entre 3 y 4 es 0,10 (empate según la guía), así que la decisión es de Inge. Mientras tanto HU-01.01 avanza con la recomendada; cambiarla ahora solo toca `scripts/migrar.mjs` y `drizzle.config.ts`.

## Decisión
Drizzle ORM (`drizzle-orm` 0.45.4 y `drizzle-kit` 0.31.11, versiones exactas) con el driver `pg`. Está en la ronda completa pero no es la opción típica (Prisma). Se combina con dos ideas de la cola:
- Migraciones en SQL plano en `api/migraciones/`, generadas por diff o escritas a mano (`npm run migracion:nueva -- <nombre>`). Las políticas RLS, `FORCE ROW LEVEL SECURITY`, los triggers de inmutabilidad y los GRANT van siempre en migraciones SQL personalizadas.
- El registro de migraciones vive en `conta_sistema.migraciones`, fuera del esquema de negocio.
- Un único adaptador `UnidadDeTrabajo` (HU-01.05) abre la transacción y fija la empresa con `set_config(..., true)`.
- Las columnas de dinero usan `numeric(..., { mode: 'string' })`. Una regla de lint (HU-01.02) prohíbe `mode: 'number'`.
- Las pruebas de adaptadores pueden correr con PGlite (Postgres en WASM) sin red; las de RLS corren además contra la rama de Neon del PR.

## Descartes relevantes
- De la cola se descarta **Slonik**: su conversión de `numeric` a float por defecto contradice la regla de dinero exacto y obliga a vigilar la configuración siempre.
- Kysely queda como plan B: si Drizzle 1.0 trae cambios incompatibles en el formato de migraciones, pasar a Kysely es barato porque las migraciones ya son SQL plano.

## Consecuencias
- Sin binarios ni paso de generación de cliente: el build en Render sigue siendo `npm ci && npm run build`.
- Riesgo: Drizzle está en transición a 1.0 (hoy en `rc`). Se fijan versiones exactas y la actualización se hace en un PR propio.
- Revertir: cambiar el migrador por otro que lea los mismos `.sql` (node-pg-migrate o Kysely) y reescribir los repositorios de infraestructura. El dominio y la aplicación no cambian.
