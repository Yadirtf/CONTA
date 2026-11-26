-- HU-04.04 Verificación en dos pasos para contador y consola (ADR-0013).
-- Corre como conta_app. El segundo factor es de la persona, no de una empresa: vive en conta_identidad, sin
-- empresa_id ni RLS, como el resto de la identidad (ADR-0010). Ninguna fila se borra y nada va en claro:
-- el secreto TOTP va cifrado (AES-256-GCM, clave fuera de la base) y los códigos de recuperación como HMAC.

-- 1. La sesión anota cuándo pasó el segundo factor. Vale una jornada; lo decide el dominio.
ALTER TABLE conta_identidad.sesiones ADD COLUMN verificada_en timestamptz
  CHECK (verificada_en IS NULL OR verificada_en >= creada_en);
--> statement-breakpoint
GRANT UPDATE (verificada_en) ON conta_identidad.sesiones TO conta_api;
--> statement-breakpoint

-- 2. Segundo factor de cada persona: la app autenticadora confirmada, la pendiente, el último código usado,
--    los fallos y los códigos de recuperación que quedan.
CREATE TABLE conta_identidad.segundos_factores (
  usuario_id uuid PRIMARY KEY REFERENCES conta_identidad.usuarios (id),
  secreto_cifrado text CHECK (secreto_cifrado ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  confirmado_en timestamptz,
  secreto_pendiente text CHECK (secreto_pendiente ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  pendiente_vence_en timestamptz,
  ultimo_paso bigint CHECK (ultimo_paso >= 0),
  fallos integer NOT NULL DEFAULT 0 CHECK (fallos BETWEEN 0 AND 5),
  bloqueado_hasta timestamptz,
  huellas_de_recuperacion text[] NOT NULL DEFAULT '{}'
    CHECK (array_to_string(huellas_de_recuperacion, ',') ~ '^([0-9a-f]{64}(,[0-9a-f]{64})*)?$'),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CHECK ((secreto_cifrado IS NULL) = (confirmado_en IS NULL)),
  CHECK ((secreto_pendiente IS NULL) = (pendiente_vence_en IS NULL))
);
--> statement-breakpoint
GRANT SELECT, INSERT ON conta_identidad.segundos_factores TO conta_api;
--> statement-breakpoint
GRANT UPDATE (secreto_cifrado, confirmado_en, secreto_pendiente, pendiente_vence_en, ultimo_paso, fallos,
  bloqueado_hasta, huellas_de_recuperacion, actualizado_en) ON conta_identidad.segundos_factores TO conta_api;
--> statement-breakpoint

-- 3. Registro de solo inserción de cada paso del segundo factor: quién, en qué sesión, cuándo y qué pasó.
CREATE TABLE conta_identidad.eventos_de_segundo_factor (
  id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  sesion_id uuid NOT NULL REFERENCES conta_identidad.sesiones (id),
  tipo text NOT NULL CHECK (tipo IN ('inscripcion-iniciada', 'inscrito', 'reemplazado', 'verificado',
    'verificado-con-recuperacion', 'fallo', 'bloqueado')),
  ocurrido_en timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX eventos_de_segundo_factor_por_usuario ON conta_identidad.eventos_de_segundo_factor (usuario_id, ocurrido_en);
--> statement-breakpoint
GRANT SELECT, INSERT ON conta_identidad.eventos_de_segundo_factor TO conta_api;
