# ADR-0006. Aislamiento multiempresa: contexto explícito, RLS forzado y llaves con empresa_id

- Estado: Aceptado
- Fecha: 2026-11-23
- Historia: HU-01.05
- Decide: Inge

## Contexto

CONTA guarda en una sola base de PostgreSQL (Neon) los datos de muchas empresas. Una fuga entre empresas es el peor fallo posible del producto: expone ventas, clientes y datos fiscales de terceros.

Restricciones duras:

- Toda tabla de negocio lleva `empresa_id` con Row Level Security y prueba de aislamiento; la API se conecta como `conta_api`, sin `BYPASSRLS` y sin ser dueña de nada (HU-01.06).
- Neon se usa con el *pooler* en modo transacción: una variable de sesión puede quedar en una conexión que luego usa otra petición.
- El dominio y la aplicación no importan frameworks, ORM ni `pg` ([arquitectura limpia](../arquitectura/arquitectura-limpia.md)).
- Todavía no hay autenticación (llega con EP-04).

Solución obvia conocida: guardar la empresa de la petición en `AsyncLocalStorage` y fijar `SET LOCAL app.empresa_id` en cada transacción.

## Alternativas consideradas (Verbalized Sampling)

Ronda completa y ronda de cola (k = 5). Las evaluó otro agente, y un tercero hizo de atacante (contrapunto abajo).

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado | Resultado |
| - | ----------- | ----------------- | ----- | ----------------- | --------- |
| 1 | `AsyncLocalStorage` con la empresa + `UnidadDeTrabajo` que fija `SET LOCAL` | 0,40 | Completa | 4,15 | Se combina (solo su forma de transacción) |
| 2 | Contexto explícito en cada caso de uso + `UnidadDeTrabajo.ejecutar(contexto, fn)` | 0,25 | Completa | **4,60** | **Elegida** |
| 3 | Interceptor de NestJS con una transacción por petición HTTP | 0,15 | Completa | 2,70 | Rechazada |
| 4 | `SET` de sesión al tomar la conexión y `RESET` al devolverla | 0,12 | Completa | — | Descartada: rompe con el *pooler* en modo transacción |
| 5 | Claims del JWT en `request.jwt.claims`, estilo Supabase | 0,08 | Completa | — | Descartada: duplica la 1 y se ata a EP-04 antes de tiempo |
| 6 | Un esquema de PostgreSQL por empresa | 0,07 | Cola | 1,80 | Rechazada |
| 7 | Un rol de base de datos por empresa con `SET ROLE` | 0,05 | Cola | 1,95 | Rechazada |
| 8 | Vistas `security_barrier` en lugar de RLS | 0,06 | Cola | — | Descartada: la vista corre como su dueño y se salta `FORCE RLS` |
| 9 | Llaves compuestas `(empresa_id, id)` en PK y FK | 0,04 | Cola | 3,50 | **Complemento adoptado** |
| 10 | Particionado por lista según `empresa_id` | 0,03 | Cola | — | Descartada: no aísla nada por sí mismo |

## Criterios y evaluación

Pesos: facilidad de cambiar de tecnología 25 %, simplicidad 25 %, pruebas sin red 20 %, costo por cliente 15 %, tiempo 15 %.

| Alternativa | Cambio | Simplicidad | Pruebas | Costo | Tiempo | Puntaje |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 | 4 | 4 | 5 | 4 | 4,15 |
| 2 | 5 | 4 | 5 | 5 | 4 | **4,60** |
| 3 | 2 | 3 | 2 | 3 | 4 | 2,70 |
| 6 | 2 | 1 | 3 | 1 | 2 | 1,80 |
| 7 | 2 | 1 | 3 | 2 | 2 | 1,95 |
| 9 (complemento) | 3 | 3 | 4 | 5 | 3 | 3,50 |

Daño máximo si falla:

- **1:** si `AsyncLocalStorage` mezcla contextos entre peticiones, se expone una empresa y el error es difícil de ver.
- **2:** el error típico es pasar un id equivocado, que expone una empresa y se ve en una revisión de código.
- **3:** mantiene la conexión abierta toda la petición, incluidas las llamadas lentas, y agota el *pooler*.
- **Común a todas:** una tabla sin política o una inyección que llame a `set_config` expone todas las empresas. Lo cubren la prueba de catálogo y la regla de lint de abajo.

### Contrapunto del atacante

Un agente buscó formas de romper el aislamiento que el diseño no cubría. Todas entran en esta historia salvo donde se indica.

| Ataque | Daño | Mitigación en HU-01.05 |
| --- | --- | --- |
| FK hacia una fila de otra empresa (PostgreSQL comprueba las FK sin RLS) y su error como oráculo de existencia | Todas | FK compuestas `(empresa_id, x_id) → (empresa_id, id)`; el catálogo lo exige |
| Índice único global (por ejemplo `nit`) cuyo error confirma datos de otra empresa | Todas | Todo índice único empieza por `empresa_id`; el catálogo lo exige |
| Rol con `BYPASSRLS` heredado, vistas sin `security_invoker` o funciones `SECURITY DEFINER` | Todas | El catálogo revisa `pg_has_role`, vistas y funciones |
| Un `set_config(..., false)` que queda fijado en la conexión del *pooler* | Una, al azar | `fijar_empresa()` aborta si la conexión ya traía empresa; prueba de 200 transacciones alternadas con un pool de 1 |
| SQL inyectado que reescribe `app.empresa_id` | Todas | ESLint prohíbe `sql.raw` y los textos con `set_config` o `app.empresa_id` en `src/`; dependency-cruiser prohíbe `pg` fuera de `compartido/infraestructura/persistencia/` |
| Secuencias globales que revelan el volumen de otras empresas | Información | Sin `serial` ni `identity`; ids `uuid` |
| Errores de base de datos con `detail` o `constraint` en la respuesta | Información | **Pospuesto:** hoy Nest responde un 500 genérico. Entra con el primer endpoint que devuelva errores de base de datos |

## Decisión

Se elige la **alternativa 2 (típica)** con la **9 de la cola** como complemento:

- **Contexto explícito.** `ContextoEmpresa` viaja como parámetro en cada caso de uso. `UnidadDeTrabajo.ejecutar(contexto, trabajo)` es la única puerta a la base de datos: abre una transacción, llama a `conta_sistema.fijar_empresa(id)` (equivale a `SET LOCAL`) y entrega a `trabajo` solo los repositorios atados a esa transacción. No se usa `AsyncLocalStorage`.
- **RLS forzado.** Cada tabla de negocio tiene `ENABLE` y `FORCE ROW LEVEL SECURITY` y una política `TO conta_api` con `USING` y `WITH CHECK` sobre `conta_sistema.empresa_actual()`, que devuelve `NULL` sin empresa fijada; así, sin empresa no se ve ni se escribe ninguna fila.
- **Llaves con empresa_id.** FK compuestas, índices únicos que empiezan por `empresa_id`, ids `uuid` sin secuencias.
- **Una prueba de catálogo** recorre `pg_catalog` en CI y falla si una tabla nueva no cumple lo anterior o no está registrada en las pruebas de aislamiento. La prueba de aislamiento corre para cada tabla registrada.
- **Empresa de la petición.** La resuelve el puerto `RESOLUTOR_DE_EMPRESA`. Hasta EP-04 la implementación por defecto responde 401; las pruebas e2e la reemplazan con un resolutor que vive en `test/` y nunca se compila en `dist/`. Un recurso de otra empresa responde 404, igual que uno que no existe.

El cómo se aplica a una tabla nueva está en [Multiempresa](../arquitectura/multiempresa.md).

## Descartes relevantes

- **4 y 8** se descartan porque su fallo expone todas las empresas a la vez.
- **6 y 7**, de la cola, multiplican migraciones, conexiones y operación por cada empresa, y con la capa gratuita de Neon no escalan.
- **10** es una optimización de rendimiento, no de aislamiento; se puede revisar cuando haya volumen.

## Consecuencias

- Se gana: aislamiento en la base de datos aunque el código tenga un error; un fallo típico expone a lo sumo una empresa; los casos de uso se prueban sin red pasando un contexto.
- Se pierde: cada caso de uso recibe un parámetro más, y cada tabla exige FK compuestas, política, permisos y registro en las pruebas.
- Para revertir: cambiar la implementación de `UnidadDeTrabajo` (por ejemplo, a `AsyncLocalStorage`) no toca el dominio ni las políticas. Quitar las FK compuestas exige una migración por tabla, por eso se adoptan ahora, con las tablas vacías.
