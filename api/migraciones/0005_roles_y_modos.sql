-- HU-04.03 Roles y modos (ADR-0012).
-- Corre como conta_app. La membresía gana rol, modo y un ciclo de vida sin borrar filas:
--   invitada (aceptada_en y retirada_en nulas) → activa (aceptada_en) → retirada (retirada_en).
-- Una membresía retirada no vuelve: si la persona regresa, se crea una fila nueva y la historia queda.
-- Los permisos de cada rol viven en el dominio (api/src/compartido/dominio/permisos); la base solo impide
-- estados imposibles. El modo cambia la interfaz y nunca da permisos.

-- 1. Cada membresía tiene su propio id: con retiros y regresos, (empresa_id, usuario_id) deja de ser único.
ALTER TABLE conta.membresias ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE conta.membresias ALTER COLUMN id DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE conta.membresias DROP CONSTRAINT membresias_pkey;
--> statement-breakpoint
ALTER TABLE conta.membresias ADD PRIMARY KEY (id);
--> statement-breakpoint

-- 2. Rol, modo y ciclo de vida. Las filas que ya existían son de quien creó la empresa: dueño, activa.
ALTER TABLE conta.membresias
  ADD COLUMN rol text NOT NULL DEFAULT 'dueno' CHECK (rol IN ('dueno', 'contador', 'cajero')),
  ADD COLUMN modo text NOT NULL DEFAULT 'simple' CHECK (modo IN ('simple', 'contador')),
  ADD COLUMN invitada_por uuid REFERENCES conta_identidad.usuarios (id),
  ADD COLUMN aceptada_en timestamptz,
  ADD COLUMN retirada_en timestamptz,
  ADD COLUMN retirada_por uuid REFERENCES conta_identidad.usuarios (id),
  -- Un cajero nunca queda en modo contador (también lo impide el dominio).
  ADD CONSTRAINT membresias_cajero_en_modo_simple CHECK (rol <> 'cajero' OR modo = 'simple'),
  ADD CONSTRAINT membresias_retiro_completo CHECK ((retirada_en IS NULL) = (retirada_por IS NULL));
--> statement-breakpoint
UPDATE conta.membresias SET aceptada_en = creada_en;
--> statement-breakpoint
ALTER TABLE conta.membresias ALTER COLUMN rol DROP DEFAULT, ALTER COLUMN modo DROP DEFAULT;
--> statement-breakpoint
-- Una sola membresía vigente (invitada o activa) por persona y empresa.
CREATE UNIQUE INDEX membresias_vigentes ON conta.membresias (empresa_id, usuario_id) WHERE retirada_en IS NULL;
--> statement-breakpoint

-- 3. Una membresía retirada no se toca más, y la aceptación no se deshace.
CREATE OR REPLACE FUNCTION conta_sistema.proteger_historia_de_membresia() RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.retirada_en IS NOT NULL THEN
    RAISE EXCEPTION 'conta: una membresía retirada no se modifica; se crea una nueva';
  END IF;
  IF OLD.aceptada_en IS NOT NULL AND NEW.aceptada_en IS DISTINCT FROM OLD.aceptada_en THEN
    RAISE EXCEPTION 'conta: la aceptación de una membresía no se cambia';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION conta_sistema.proteger_historia_de_membresia() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER membresias_proteger_historia
  BEFORE UPDATE ON conta.membresias
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.proteger_historia_de_membresia();
--> statement-breakpoint

-- 4. conta_api cambia solo estas columnas; nunca empresa, persona, id ni fechas de creación. Sigue sin DELETE.
GRANT UPDATE (rol, modo, aceptada_en, retirada_en, retirada_por) ON conta.membresias TO conta_api;
--> statement-breakpoint

-- 5. En una transacción del usuario solo cuentan las membresías vigentes: quien fue retirado deja de ver la
--    empresa en la siguiente petición. Las invitadas se ven, para poder aceptarlas o rechazarlas.
DROP POLICY membresias_del_usuario_actual ON conta.membresias;
--> statement-breakpoint
CREATE POLICY membresias_del_usuario_actual ON conta.membresias
  FOR SELECT
  TO conta_api
  USING (
    conta_sistema.empresa_actual() IS NULL
    AND usuario_id = conta_sistema.usuario_actual()
    AND retirada_en IS NULL
  );
--> statement-breakpoint
DROP POLICY empresas_del_usuario_actual ON conta.empresas;
--> statement-breakpoint
CREATE POLICY empresas_del_usuario_actual ON conta.empresas
  FOR SELECT
  TO conta_api
  USING (
    conta_sistema.empresa_actual() IS NULL
    AND EXISTS (
      SELECT 1 FROM conta.membresias m
       WHERE m.empresa_id = empresas.id
         AND m.usuario_id = conta_sistema.usuario_actual()
         AND m.retirada_en IS NULL
    )
  );
