-- HU-06.08 Comprobante con QR por WhatsApp y correo: la respuesta de aceptación de la DIAN (ApplicationResponse),
-- el correo de la factura al comprador y sus intentos. Corre como conta_app. Todas las tablas llevan empresa_id,
-- RLS forzado y la política de la empresa actual (ADR-0006). Nada de esto se borra.
-- El PDF no se guarda: se arma a pedido, siempre igual, desde la venta y el XML firmado (sin enlace público).

-- 1. Respuesta de la DIAN al aceptar (XmlBase64Bytes de GetStatusZip). La pide el contenedor AttachedDocument
--    que se entrega al comprador; se guarda ya porque después no siempre se puede volver a pedir. Solo inserción.
CREATE TABLE conta.respuestas_de_aceptacion (
  empresa_id uuid NOT NULL,
  envio_id uuid NOT NULL,
  -- Hasta ~3 MB de XML en base64: la DIAN responde unos pocos KB.
  xml_base64 text NOT NULL CHECK (char_length(xml_base64) BETWEEN 4 AND 4000000 AND xml_base64 ~ '^[A-Za-z0-9+/]+={0,2}$'),
  recibida_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, envio_id),
  FOREIGN KEY (empresa_id, envio_id) REFERENCES conta.envios_dian (empresa_id, id)
);
--> statement-breakpoint
ALTER TABLE conta.respuestas_de_aceptacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.respuestas_de_aceptacion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY respuestas_de_aceptacion_de_la_empresa_actual ON conta.respuestas_de_aceptacion
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.respuestas_de_aceptacion TO conta_api;
--> statement-breakpoint
-- Solo de un envío aceptado: nadie guarda una «aceptación» de un documento rechazado o en camino.
CREATE FUNCTION conta_sistema.respuesta_de_envio_aceptado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conta.envios_dian e WHERE e.empresa_id = NEW.empresa_id AND e.id = NEW.envio_id AND e.estado = 'aceptado'
  ) THEN
    RAISE EXCEPTION 'Solo un envío aceptado tiene respuesta de aceptación' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER respuesta_de_envio_aceptado BEFORE INSERT ON conta.respuestas_de_aceptacion
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.respuesta_de_envio_aceptado();
--> statement-breakpoint

-- 2. Correo de la factura: uno por venta, pedido al aceptarse. No guarda la dirección (sale de la venta, que no
--    cambia) ni mensajes del proveedor: solo el estado, los intentos y el código de la última falla.
CREATE TABLE conta.correos_de_factura (
  empresa_id uuid NOT NULL,
  venta_id uuid NOT NULL,
  estado text NOT NULL CHECK (estado IN ('pendiente', 'enviado', 'fallido')),
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 20),
  proximo_intento_en timestamptz,
  -- Hasta cuándo lo tiene tomado un procesador (lo fija tomar_correos_vencidos); no es parte del estado.
  reservado_hasta timestamptz,
  ultima_falla text CHECK (ultima_falla ~ '^[a-z0-9.-]{1,64}$'),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, venta_id),
  FOREIGN KEY (empresa_id, venta_id) REFERENCES conta.ventas (empresa_id, id),
  CHECK ((estado = 'pendiente') = (proximo_intento_en IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX correos_de_factura_por_vencer ON conta.correos_de_factura (proximo_intento_en) WHERE estado = 'pendiente';
--> statement-breakpoint
ALTER TABLE conta.correos_de_factura ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.correos_de_factura FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY correos_de_factura_de_la_empresa_actual ON conta.correos_de_factura
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.correos_de_factura TO conta_api;
--> statement-breakpoint
GRANT UPDATE (estado, intentos, proximo_intento_en, ultima_falla, actualizado_en) ON conta.correos_de_factura TO conta_api;
--> statement-breakpoint
-- Un correo solo se pide para una venta cuya factura la DIAN aceptó y cuyo comprador tiene correo.
CREATE FUNCTION conta_sistema.correo_de_venta_aceptada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conta.ventas v
      JOIN conta.emisiones_de_venta m ON m.empresa_id = v.empresa_id AND m.venta_id = v.id
      JOIN conta.envios_dian e ON e.empresa_id = m.empresa_id AND e.id = m.envio_id
     WHERE v.empresa_id = NEW.empresa_id AND v.id = NEW.venta_id AND e.estado = 'aceptado'
       AND v.comprador ->> 'correo' IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Solo una venta aceptada con comprador con correo lleva correo' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER correo_de_venta_aceptada BEFORE INSERT ON conta.correos_de_factura
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.correo_de_venta_aceptada();
--> statement-breakpoint
-- Un correo terminado no vuelve atrás y los intentos solo suben (nadie lo reabre para mandarlo otra vez).
CREATE FUNCTION conta_sistema.correo_solo_avanza() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado <> 'pendiente' OR NEW.intentos <> OLD.intentos + 1 THEN
    RAISE EXCEPTION 'El correo solo avanza de a un intento mientras está pendiente' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER correo_solo_avanza BEFORE UPDATE OF estado, intentos, proximo_intento_en, ultima_falla ON conta.correos_de_factura
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.correo_solo_avanza();
--> statement-breakpoint

-- 3. Intentos del correo: cada llamada al proveedor, solo inserción.
CREATE TABLE conta.intentos_correo_de_factura (
  empresa_id uuid NOT NULL,
  venta_id uuid NOT NULL,
  numero integer NOT NULL CHECK (numero BETWEEN 1 AND 20),
  resultado text NOT NULL CHECK (resultado IN ('enviado', 'falla-pasajera', 'falla-permanente')),
  detalle text NOT NULL CHECK (detalle ~ '^[a-z0-9.-]{1,64}$'),
  duracion_ms integer NOT NULL CHECK (duracion_ms >= 0),
  ocurrido_en timestamptz NOT NULL,
  PRIMARY KEY (empresa_id, venta_id, numero),
  FOREIGN KEY (empresa_id, venta_id) REFERENCES conta.correos_de_factura (empresa_id, venta_id)
);
--> statement-breakpoint
ALTER TABLE conta.intentos_correo_de_factura ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.intentos_correo_de_factura FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY intentos_correo_de_la_empresa_actual ON conta.intentos_correo_de_factura
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.intentos_correo_de_factura TO conta_api;
--> statement-breakpoint

-- 4. Tomar los correos vencidos de todas las empresas sin darle a conta_api una tabla sin RLS (a diferencia de las
--    colas de ADR-0008): esta función, del dueño, solo devuelve ids y marca la reserva con la hora de la base, así
--    que quien la llame no puede ver datos ni aplazar correos ajenos. Lote de 50 como máximo.
CREATE FUNCTION conta_sistema.tomar_correos_vencidos(p_limite integer)
  RETURNS TABLE (empresa_id uuid, venta_id uuid)
  LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  UPDATE conta.correos_de_factura AS c
     SET reservado_hasta = now() + interval '2 minutes'
    FROM (SELECT t.empresa_id, t.venta_id FROM conta.correos_de_factura t
           WHERE t.estado = 'pendiente' AND t.proximo_intento_en <= now()
             AND (t.reservado_hasta IS NULL OR t.reservado_hasta <= now())
           ORDER BY t.proximo_intento_en
           LIMIT least(greatest(p_limite, 0), 50)
           FOR UPDATE SKIP LOCKED) AS vencidos
   WHERE c.empresa_id = vencidos.empresa_id AND c.venta_id = vencidos.venta_id
  RETURNING c.empresa_id, c.venta_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION conta_sistema.tomar_correos_vencidos(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION conta_sistema.tomar_correos_vencidos(integer) TO conta_api;
