-- HU-04.01 Registro e inicio de sesión con celular y código (ADR-0010).
-- Corre como conta_app. Las tablas de identidad no son de negocio: una persona existe antes de pertenecer
-- a una empresa y puede pertenecer a varias (HU-04.02). Por eso viven en su propio esquema, sin empresa_id ni
-- RLS, y conta_api solo recibe lo que usa. Ninguna fila se borra: el historial de accesos queda.
-- Ningún secreto se guarda en claro: el código como HMAC y el token de sesión como SHA-256.

CREATE SCHEMA IF NOT EXISTS conta_identidad;
--> statement-breakpoint
GRANT USAGE ON SCHEMA conta_identidad TO conta_api;
--> statement-breakpoint

-- 1. Personas. El celular en E.164 es único: es con lo que la persona entra.
CREATE TABLE conta_identidad.usuarios (
  id uuid PRIMARY KEY,
  celular text NOT NULL UNIQUE CHECK (celular ~ '^\+573\d{9}$'),
  creado_en timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
GRANT SELECT, INSERT ON conta_identidad.usuarios TO conta_api;
--> statement-breakpoint

-- 2. Estado del acceso con código de cada celular: el código vigente, los fallos, el bloqueo y los límites.
--    Una fila por celular, aunque todavía no sea usuario (así el límite aplica también a números nuevos).
CREATE TABLE conta_identidad.accesos (
  celular text PRIMARY KEY CHECK (celular ~ '^\+573\d{9}$'),
  huella_codigo text CHECK (huella_codigo ~ '^[0-9a-f]{64}$'),
  codigo_vence_en timestamptz,
  fallos integer NOT NULL DEFAULT 0 CHECK (fallos BETWEEN 0 AND 5),
  bloqueado_hasta timestamptz,
  ventana_desde timestamptz,
  codigos_en_ventana integer NOT NULL DEFAULT 0 CHECK (codigos_en_ventana >= 0),
  ultimo_codigo_en timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CHECK ((huella_codigo IS NULL) = (codigo_vence_en IS NULL))
);
--> statement-breakpoint
GRANT SELECT, INSERT ON conta_identidad.accesos TO conta_api;
--> statement-breakpoint
GRANT UPDATE (huella_codigo, codigo_vence_en, fallos, bloqueado_hasta, ventana_desde, codigos_en_ventana,
  ultimo_codigo_en, actualizado_en) ON conta_identidad.accesos TO conta_api;
--> statement-breakpoint

-- 3. Sesiones por dispositivo. Solo cambia revocada_en, al cerrar sesión.
CREATE TABLE conta_identidad.sesiones (
  id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  huella_token text NOT NULL UNIQUE CHECK (huella_token ~ '^[0-9a-f]{64}$'),
  creada_en timestamptz NOT NULL,
  vence_en timestamptz NOT NULL CHECK (vence_en > creada_en),
  revocada_en timestamptz
);
--> statement-breakpoint
CREATE INDEX sesiones_por_usuario ON conta_identidad.sesiones (usuario_id);
--> statement-breakpoint
GRANT SELECT, INSERT ON conta_identidad.sesiones TO conta_api;
--> statement-breakpoint
GRANT UPDATE (revocada_en) ON conta_identidad.sesiones TO conta_api;
