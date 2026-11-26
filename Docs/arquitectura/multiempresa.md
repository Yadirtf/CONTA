# Multiempresa

Cómo se aíslan los datos de cada empresa en la API y qué hay que hacer al crear una tabla. La decisión está en [ADR-0006](../decisiones/0006-aislamiento-multiempresa-con-rls.md).

## 1. Cómo funciona

1. **Presentación.** La guarda `GuardaDeEmpresa` pide la empresa al puerto `RESOLUTOR_DE_EMPRESA`, que implementa `ResolutorPorMembresia` en el módulo de empresas ([ADR-0011](../decisiones/0011-pertenecer-a-varias-empresas.md)): la sesión (`Authorization: Bearer`) dice quién es, el encabezado `X-Empresa` dice en qué empresa trabaja y la membresía, consultada en cada petición dentro de una transacción de esa empresa, dice si puede. Sin sesión responde 401, sin `X-Empresa` 400 y con una empresa ajena 404. El controlador recibe la empresa con `@EmpresaDeLaPeticion()` como un `ContextoEmpresa`. Un módulo con endpoints de empresa importa `EmpresasModule`, que exporta la guarda y el resolutor.
2. **Aplicación.** El caso de uso recibe el `ContextoEmpresa` como parámetro y llama a `UnidadDeTrabajo.ejecutar(contexto, ({ repositorio }) => ...)`. No filtra por empresa a mano.
3. **Infraestructura.** `UnidadDeTrabajoPostgres` abre una transacción, llama a `conta_sistema.fijar_empresa(id)` y crea los repositorios con esa transacción. La función aborta si la conexión ya traía una empresa fijada, para no mezclar empresas en el *pooler*.
4. **Base de datos.** La API se conecta como `conta_api`, sin `BYPASSRLS` y sin ser dueña de ninguna tabla. Las políticas comparan la columna de empresa con `conta_sistema.empresa_actual()`, que es `NULL` sin empresa fijada: sin contexto no se ve ni se escribe nada.

Un recurso de otra empresa no existe para la API: responde 404, igual que un id inexistente.

### La transacción del usuario (HU-04.02)

Para listar «mis empresas» hay una segunda clase de transacción, `UnidadDeTrabajoDelUsuario`. Llama a `conta_sistema.fijar_usuario(id)` en lugar de fijar una empresa. Las políticas `*_del_usuario_actual` (en `conta.membresias` y `conta.empresas`) son `FOR SELECT` y exigen `conta_sistema.empresa_actual() IS NULL`. En esa transacción solo se leen las membresías de la persona y sus empresas, y no se puede escribir. `fijar_usuario()` y `fijar_empresa()` se excluyen mutuamente: las políticas permisivas se suman con OR y una transacción con las dos vería más de lo debido. La prueba de catálogo exige esa forma a toda política cuyo nombre termine en `_del_usuario_actual`.

Reglas que vigila CI:

- ESLint prohíbe en `src/` `sql.raw` y cualquier texto con `set_config`, `app.empresa_id` o `app.usuario_id`.
- dependency-cruiser prohíbe importar `pg` fuera de `src/compartido/infraestructura/persistencia/`.
- La [prueba de catálogo](../../api/test/integracion/aislamiento/catalogo.int-spec.ts) recorre `pg_catalog` y revisa todas las tablas de los esquemas de negocio.

## 2. Crear una tabla de negocio

Una migración escrita a mano (`npm run migracion:nueva -- <nombre>`) con este molde. Las tablas de negocio van en el esquema `conta`, del que `conta_app` es dueño; no en `public`, donde en Neon `conta_app` no puede crear tablas:

```sql
CREATE TABLE conta.clientes (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  id uuid NOT NULL,
  nit text NOT NULL,
  PRIMARY KEY (empresa_id, id),          -- la llave empieza por empresa_id
  UNIQUE (empresa_id, nit)               -- todo índice único empieza por empresa_id
);
--> statement-breakpoint
ALTER TABLE conta.clientes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.clientes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY clientes_de_la_empresa_actual ON conta.clientes TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON conta.clientes TO conta_api;
```

Y una tabla hija referencia al padre con la empresa incluida, para que nunca apunte a una fila de otra empresa:

```sql
FOREIGN KEY (empresa_id, cliente_id) REFERENCES conta.clientes (empresa_id, id)
```

Reglas:

- **Columna `empresa_id uuid NOT NULL`** en toda tabla de negocio. La única excepción es `empresas`, cuya columna de empresa es su propio `id`.
- **Ids `uuid`** generados en la aplicación. Nada de `serial` ni `identity`: una secuencia global revela cuántos registros tienen las demás empresas. La numeración fiscal (facturas) se lleva por empresa y por resolución, no con secuencias.
- **Permisos mínimos por tabla.** Solo lo que la API usa. Documentos enviados a la DIAN y asientos contables: `SELECT, INSERT`, sin `UPDATE` ni `DELETE`.
- **Sin vistas** salvo con `security_invoker = true`, y **sin funciones `SECURITY DEFINER`**: corren como el dueño y se saltan RLS.

## 3. Registrar la tabla en las pruebas

La prueba de catálogo falla mientras la tabla no esté en `FABRICAS` de [`test/integracion/aislamiento/fabricas.ts`](../../api/test/integracion/aislamiento/fabricas.ts). Cada entrada dice cuál es la columna de empresa y cómo insertar una fila válida; con eso, [`aislamiento.int-spec.ts`](../../api/test/integracion/aislamiento/aislamiento.int-spec.ts) comprueba para esa tabla que:

- sin empresa fijada no se ven filas;
- A ve su fila y B no la ve ni la puede actualizar;
- `WITH CHECK` impide mover una fila a otra empresa.

Las pruebas corren en CI contra la rama `preview/pr-<n>` de Neon como `conta_api`, y localmente con un PostgreSQL propio (ver [entorno de pruebas](../despliegue/entorno-de-pruebas.md)).

## 4. Del lado de la API

- El repositorio vive en `infraestructura/persistencia/` del módulo y recibe el ejecutor de la transacción; no importa `pg` ni el pool.
- Los repositorios se exponen a la aplicación como un objeto (`RepositoriosDe<Modulo>`) que crea la `UnidadDeTrabajo` del módulo en su `*.module.ts`. Ejemplo: [`modulos/empresas`](../../api/src/modulos/empresas/).
- Los trabajos en cola (DIAN, Wompi) también reciben un `ContextoEmpresa` explícito con cada mensaje; nunca lo heredan de un trabajo anterior.
