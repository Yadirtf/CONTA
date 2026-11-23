-- HU-02.03 Envío de documentos a la DIAN (habilitación), con cola durable y registro de intentos (ADR-0008).
-- Corre como conta_app. conta_api solo recibe lo que necesita: los documentos enviados y los intentos no se
-- editan ni se borran (sin UPDATE en sus columnas ni DELETE).

-- 1. Envíos: un documento firmado por fila, único por empresa y CUFE (la solicitud es idempotente).
CREATE TABLE conta.envios_dian (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  id uuid PRIMARY KEY,
  cufe text NOT NULL CHECK (cufe ~ '^[0-9a-f]{96}$'),
  numero text NOT NULL CHECK (length(numero) BETWEEN 1 AND 20),
  nit_emisor text NOT NULL CHECK (nit_emisor ~ '^\d{1,10}$'),
  anio integer NOT NULL CHECK (anio BETWEEN 2000 AND 2999),
  consecutivo integer NOT NULL CHECK (consecutivo >= 1),
  xml_firmado text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('pendiente', 'en-validacion', 'aceptado', 'rechazado', 'fallido')),
  zip_key text,
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  fallas_seguidas integer NOT NULL DEFAULT 0 CHECK (fallas_seguidas >= 0),
  consultas integer NOT NULL DEFAULT 0 CHECK (consultas >= 0),
  proximo_intento_en timestamptz,
  respuesta_valida boolean,
  respuesta_codigo text,
  respuesta_descripcion text,
  respuesta_mensajes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(respuesta_mensajes) = 'array'),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, id),
  UNIQUE (empresa_id, cufe),
  UNIQUE (empresa_id, anio, consecutivo)
);
--> statement-breakpoint
ALTER TABLE conta.envios_dian ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.envios_dian FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY envios_dian_de_la_empresa_actual ON conta.envios_dian
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
-- Solo cambian las columnas del estado. El documento, su CUFE y su nombre de archivo quedan fijos.
GRANT SELECT, INSERT ON conta.envios_dian TO conta_api;
--> statement-breakpoint
GRANT UPDATE (estado, zip_key, intentos, fallas_seguidas, consultas, proximo_intento_en, respuesta_valida,
  respuesta_codigo, respuesta_descripcion, respuesta_mensajes, actualizado_en) ON conta.envios_dian TO conta_api;
--> statement-breakpoint

-- 2. Intentos: cada llamada a la DIAN, solo inserción.
CREATE TABLE conta.intentos_envio_dian (
  empresa_id uuid NOT NULL,
  id uuid PRIMARY KEY,
  envio_id uuid NOT NULL,
  numero integer NOT NULL CHECK (numero >= 1),
  operacion text NOT NULL CHECK (operacion IN ('SendTestSetAsync', 'GetStatusZip')),
  resultado text NOT NULL CHECK (resultado IN ('recibido', 'aceptado', 'rechazado', 'en-proceso', 'falla-de-comunicacion')),
  detalle text NOT NULL CHECK (length(detalle) <= 2000),
  duracion_ms integer NOT NULL CHECK (duracion_ms >= 0),
  ocurrido_en timestamptz NOT NULL,
  FOREIGN KEY (empresa_id, envio_id) REFERENCES conta.envios_dian (empresa_id, id),
  UNIQUE (empresa_id, envio_id, numero)
);
--> statement-breakpoint
ALTER TABLE conta.intentos_envio_dian ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.intentos_envio_dian FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY intentos_envio_dian_de_la_empresa_actual ON conta.intentos_envio_dian
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.intentos_envio_dian TO conta_api;
--> statement-breakpoint

-- 3. Cola de trabajos con la DIAN. Vive en conta_sistema y no tiene RLS porque el procesador toma los
--    vencidos de todas las empresas; por eso solo guarda ids y la hora, nunca datos del documento.
--    Cada trabajo se procesa después en la transacción de su empresa, donde RLS sí aplica.
--    Se reemplaza por el adaptador durable que elija HU-06.04.
CREATE TABLE conta_sistema.cola_envios_dian (
  empresa_id uuid NOT NULL,
  envio_id uuid NOT NULL,
  ejecutar_en timestamptz NOT NULL,
  PRIMARY KEY (empresa_id, envio_id),
  FOREIGN KEY (empresa_id, envio_id) REFERENCES conta.envios_dian (empresa_id, id)
);
--> statement-breakpoint
CREATE INDEX cola_envios_dian_por_hora ON conta_sistema.cola_envios_dian (ejecutar_en);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON conta_sistema.cola_envios_dian TO conta_api;
