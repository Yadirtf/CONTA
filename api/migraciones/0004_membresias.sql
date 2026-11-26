-- HU-04.02 Pertenecer a varias empresas (ADR-0011).
-- Corre como conta_app. Una persona (conta_identidad.usuarios) pertenece a una empresa por una membresía.
-- La API conoce dos clases de transacción, que nunca se mezclan:
--   * de empresa: fija app.empresa_id con fijar_empresa(); ve solo esa empresa (ADR-0006);
--   * del usuario: fija app.usuario_id con fijar_usuario(); solo puede LEER sus membresías y las empresas a
--     las que pertenece. Ninguna otra tabla de negocio le muestra filas y no puede escribir nada.
-- Las políticas permisivas se suman con OR: por eso las del usuario exigen además empresa_actual() IS NULL,
-- y fijar_empresa() y fijar_usuario() se excluyen mutuamente.

-- 1. Usuario de la transacción en curso. Igual que empresa_actual(): sin valor, o con uno que no es uuid, NULL.
CREATE OR REPLACE FUNCTION conta_sistema.usuario_actual() RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY INVOKER
  SET search_path = pg_catalog
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.usuario_id', true), '')::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION conta_sistema.usuario_actual() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION conta_sistema.usuario_actual() TO conta_api;
--> statement-breakpoint

-- 2. Única forma de fijar el usuario de una transacción (SET LOCAL). Aborta si la conexión ya trae usuario o
--    empresa: así una transacción nunca suma la visibilidad de las dos políticas.
CREATE OR REPLACE FUNCTION conta_sistema.fijar_usuario(usuario uuid) RETURNS void
  LANGUAGE plpgsql
  VOLATILE
  SECURITY INVOKER
  SET search_path = pg_catalog
AS $$
BEGIN
  IF usuario IS NULL THEN
    RAISE EXCEPTION 'conta: el usuario de la transacción no puede ser nulo';
  END IF;
  IF NULLIF(current_setting('app.usuario_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'conta: la conexión ya tenía un usuario fijado; se aborta para no mezclar usuarios';
  END IF;
  IF NULLIF(current_setting('app.empresa_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'conta: la transacción ya tiene empresa; una transacción es de empresa o del usuario, nunca de ambos';
  END IF;
  PERFORM set_config('app.usuario_id', usuario::text, true);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION conta_sistema.fijar_usuario(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION conta_sistema.fijar_usuario(uuid) TO conta_api;
--> statement-breakpoint

-- 3. fijar_empresa() de la 0001, ahora también aborta si la transacción ya es del usuario.
CREATE OR REPLACE FUNCTION conta_sistema.fijar_empresa(empresa uuid) RETURNS void
  LANGUAGE plpgsql
  VOLATILE
  SECURITY INVOKER
  SET search_path = pg_catalog
AS $$
BEGIN
  IF empresa IS NULL THEN
    RAISE EXCEPTION 'conta: la empresa de la transacción no puede ser nula';
  END IF;
  IF NULLIF(current_setting('app.empresa_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'conta: la conexión ya tenía una empresa fijada; se aborta para no mezclar empresas';
  END IF;
  IF NULLIF(current_setting('app.usuario_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'conta: la transacción ya es del usuario; una transacción es de empresa o del usuario, nunca de ambos';
  END IF;
  PERFORM set_config('app.empresa_id', empresa::text, true);
END
$$;
--> statement-breakpoint

-- 4. Membresías: quién pertenece a qué empresa. Tabla de negocio: lleva empresa_id y RLS forzado.
--    La llave empieza por empresa_id; el índice por usuario sirve al listado de «mis empresas».
--    usuario_id apunta a conta_identidad, que no tiene empresa: esa FK no puede cruzar empresas.
--    HU-04.03 añade el rol y el retiro de la membresía (sin borrar la fila).
CREATE TABLE conta.membresias (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  usuario_id uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  creada_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, usuario_id)
);
--> statement-breakpoint
CREATE INDEX membresias_por_usuario ON conta.membresias (usuario_id);
--> statement-breakpoint
ALTER TABLE conta.membresias ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.membresias FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY membresias_de_la_empresa_actual ON conta.membresias
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
-- Solo lectura y solo en una transacción del usuario. No mira conta.empresas: así no hay recursión de políticas.
CREATE POLICY membresias_del_usuario_actual ON conta.membresias
  FOR SELECT
  TO conta_api
  USING (conta_sistema.empresa_actual() IS NULL AND usuario_id = conta_sistema.usuario_actual());
--> statement-breakpoint
-- Sin UPDATE ni DELETE: la membresía no cambia de empresa ni de persona.
GRANT SELECT, INSERT ON conta.membresias TO conta_api;
--> statement-breakpoint

-- 5. En una transacción del usuario, las empresas a las que pertenece se pueden leer (para listarlas).
CREATE POLICY empresas_del_usuario_actual ON conta.empresas
  FOR SELECT
  TO conta_api
  USING (
    conta_sistema.empresa_actual() IS NULL
    AND EXISTS (
      SELECT 1 FROM conta.membresias m
       WHERE m.empresa_id = empresas.id AND m.usuario_id = conta_sistema.usuario_actual()
    )
  );
