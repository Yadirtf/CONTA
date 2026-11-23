-- HU-01.05 Aislamiento multiempresa con RLS (ADR-0006).
-- Corre como conta_app (dueño). La API se conecta como conta_api: sin BYPASSRLS, no es dueño de nada
-- y solo recibe los permisos que cada migración le da tabla por tabla.

-- 1. El rol de la API debe existir antes de darle permisos (Docs/despliegue/entorno-de-pruebas.md, 4.1).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'conta_api') THEN
    RAISE EXCEPTION 'Falta el rol conta_api. Créelo por SQL sin BYPASSRLS antes de migrar (Docs/despliegue/entorno-de-pruebas.md, sección 4.1).';
  END IF;
END
$$;
--> statement-breakpoint

-- 2. Empresa de la transacción en curso. La infraestructura la fija con set_config('app.empresa_id', id, true)
--    (equivale a SET LOCAL) al abrir cada transacción. Sin valor, o con un valor que no es uuid, devuelve NULL,
--    y como NULL nunca es igual a nada, las políticas no dejan ver ni escribir ninguna fila.
--    Al terminar una transacción con SET LOCAL el valor queda en '' (no NULL): por eso el NULLIF.
CREATE OR REPLACE FUNCTION conta_sistema.empresa_actual() RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY INVOKER
  SET search_path = pg_catalog
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.empresa_id', true), '')::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION conta_sistema.empresa_actual() FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA conta_sistema TO conta_api;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION conta_sistema.empresa_actual() TO conta_api;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO conta_api;
--> statement-breakpoint

-- 3. Empresas: la raíz del aislamiento. Su llave de empresa es su propio id.
--    Las demás tablas de negocio llevan empresa_id con FK compuesta (empresa_id, id) hacia sus padres,
--    para que una fila nunca pueda apuntar a otra empresa (ver Docs/arquitectura/multiempresa.md).
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY,
  razon_social text NOT NULL CHECK (length(btrim(razon_social)) BETWEEN 1 AND 450),
  creada_en timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY empresas_de_la_empresa_actual ON public.empresas
  TO conta_api
  USING (id = conta_sistema.empresa_actual())
  WITH CHECK (id = conta_sistema.empresa_actual());
--> statement-breakpoint
-- Sin DELETE: una empresa no se borra (tiene documentos fiscales); se desactiva en su historia.
GRANT SELECT, INSERT, UPDATE ON public.empresas TO conta_api;
--> statement-breakpoint

-- 4. Única forma de fijar la empresa de una transacción. Falla si la conexión ya trae una empresa:
--    eso solo pasa si alguien la fijó a nivel de sesión (set_config(..., false)), y con el pooler esa
--    conexión podría llegarle a otra empresa. Así una fuga de contexto se detiene en vez de mezclar datos.
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
  PERFORM set_config('app.empresa_id', empresa::text, true);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION conta_sistema.fijar_empresa(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION conta_sistema.fijar_empresa(uuid) TO conta_api;
