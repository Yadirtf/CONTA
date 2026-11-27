-- HU-06.01 Factura en 3 toques: datos fiscales del emisor, resolución de numeración con su consecutivo, ventas
-- con sus líneas, el enlace de cada venta con su envío a la DIAN y la cola de emisiones por terminar.
-- Corre como conta_app. Todas las tablas de negocio llevan empresa_id, RLS forzado y la política de la empresa
-- actual (ADR-0006). Una venta no se edita ni se borra: conta_api solo puede leer e insertar.

-- 1. Datos del facturador como van en la factura (RUT). Los llena el comando configurar-facturacion (conta_app)
--    hasta que exista el asistente de habilitación (EP-07); la API solo los lee.
CREATE TABLE conta.datos_fiscales (
  empresa_id uuid PRIMARY KEY REFERENCES conta.empresas (id),
  -- Sin dígito de verificación: el dominio lo calcula (Nit).
  nit text NOT NULL CHECK (nit ~ '^[1-9][0-9]{2,14}$'),
  razon_social text NOT NULL CHECK (char_length(razon_social) BETWEEN 1 AND 450 AND razon_social !~ '[\x01-\x1f\x7f-\x9f]'),
  tipo_de_persona text NOT NULL CHECK (tipo_de_persona IN ('juridica', 'natural')),
  responsabilidades_fiscales text[] NOT NULL CHECK (
    cardinality(responsabilidades_fiscales) BETWEEN 1 AND 4
    AND responsabilidades_fiscales <@ ARRAY['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN']
  ),
  responsable_de_iva boolean NOT NULL,
  codigo_municipio text NOT NULL CHECK (codigo_municipio ~ '^[0-9]{5}$' AND right(codigo_municipio, 3) <> '000'),
  ciudad text NOT NULL CHECK (char_length(ciudad) BETWEEN 1 AND 200 AND ciudad !~ '[\x01-\x1f\x7f-\x9f]'),
  departamento text NOT NULL CHECK (char_length(departamento) BETWEEN 1 AND 200 AND departamento !~ '[\x01-\x1f\x7f-\x9f]'),
  direccion text NOT NULL CHECK (char_length(direccion) BETWEEN 1 AND 200 AND direccion !~ '[\x01-\x1f\x7f-\x9f]'),
  correo text CHECK (char_length(correo) <= 254 AND correo ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$')
);
--> statement-breakpoint
ALTER TABLE conta.datos_fiscales ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.datos_fiscales FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY datos_fiscales_de_la_empresa_actual ON conta.datos_fiscales
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT ON conta.datos_fiscales TO conta_api;
--> statement-breakpoint

-- 2. Resoluciones de numeración que la DIAN autorizó. `siguiente` es el próximo consecutivo libre: reservar es un
--    UPDATE ... RETURNING en la misma transacción que guarda la venta, así que un fallo devuelve el número (sin
--    huecos) y dos ventas a la vez nunca reciben el mismo (sin duplicados). Solo esa columna cambia, y solo sube.
CREATE TABLE conta.resoluciones_de_numeracion (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  id uuid NOT NULL,
  numero text NOT NULL CHECK (numero ~ '^[0-9]{1,14}$'),
  prefijo text NOT NULL CHECK (prefijo ~ '^[A-Za-z0-9]{0,4}$'),
  desde bigint NOT NULL CHECK (desde >= 1),
  hasta bigint NOT NULL CHECK (hasta <= 9007199254740991),
  vigente_desde date NOT NULL,
  vigente_hasta date NOT NULL,
  siguiente bigint NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id),
  UNIQUE (empresa_id, prefijo, numero),
  CHECK (hasta >= desde AND vigente_hasta >= vigente_desde),
  CHECK (siguiente BETWEEN desde AND hasta + 1)
);
--> statement-breakpoint
-- Defensa en profundidad: aunque conta_api pueda actualizar `siguiente`, solo puede reservar de a un número. Ni
-- bajarlo ni saltar (huecos o un rango agotado a propósito: hallazgo H4 de la prueba de ataque).
CREATE FUNCTION conta_sistema.consecutivo_solo_sube() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.siguiente <> OLD.siguiente + 1 THEN
    RAISE EXCEPTION 'El consecutivo de la resolución solo sube de a uno' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER consecutivo_solo_sube BEFORE UPDATE OF siguiente ON conta.resoluciones_de_numeracion
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.consecutivo_solo_sube();
--> statement-breakpoint
-- Dos resoluciones del mismo prefijo no pueden cruzar sus rangos: cada número se reservaría dos veces y todas las
-- ventas chocarían (hallazgo H3). Un candado por empresa y prefijo evita que dos altas a la vez se crucen.
CREATE FUNCTION conta_sistema.rango_sin_cruces() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('resoluciones:' || NEW.empresa_id::text || ':' || NEW.prefijo));
  IF EXISTS (
    SELECT 1 FROM conta.resoluciones_de_numeracion r
     WHERE r.empresa_id = NEW.empresa_id AND r.prefijo = NEW.prefijo AND r.id <> NEW.id
       AND r.desde <= NEW.hasta AND NEW.desde <= r.hasta
  ) THEN
    RAISE EXCEPTION 'El rango se cruza con otra resolución del mismo prefijo' USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER rango_sin_cruces BEFORE INSERT OR UPDATE OF desde, hasta, prefijo ON conta.resoluciones_de_numeracion
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.rango_sin_cruces();
--> statement-breakpoint
ALTER TABLE conta.resoluciones_de_numeracion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.resoluciones_de_numeracion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY resoluciones_de_la_empresa_actual ON conta.resoluciones_de_numeracion
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT ON conta.resoluciones_de_numeracion TO conta_api;
--> statement-breakpoint
GRANT UPDATE (siguiente) ON conta.resoluciones_de_numeracion TO conta_api;
--> statement-breakpoint

-- 3. Ventas: el documento tal como se emitió. Copia al comprador y los productos para que un cambio en el
--    catálogo nunca cambie una venta. El id lo elige la app (idempotencia) y `huella` resume lo pedido: el mismo id
--    con otro pedido se rechaza.
CREATE TABLE conta.ventas (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  id uuid NOT NULL,
  huella text NOT NULL CHECK (huella ~ '^[0-9a-f]{64}$'),
  resolucion_id uuid NOT NULL,
  prefijo text NOT NULL CHECK (prefijo ~ '^[A-Za-z0-9]{0,4}$'),
  consecutivo bigint NOT NULL CHECK (consecutivo >= 1),
  emitida_en timestamptz NOT NULL,
  medio_de_pago text NOT NULL CHECK (medio_de_pago IN ('efectivo', 'tarjeta-debito', 'tarjeta-credito', 'transferencia')),
  -- El adquirente como quedó en la factura (consumidor final o un comprador del catálogo). Lo valida el dominio.
  comprador jsonb NOT NULL CHECK (
    jsonb_typeof(comprador) = 'object' AND pg_column_size(comprador) <= 4096
    AND comprador ?& ARRAY['tipoIdentificacion', 'numero', 'razonSocial', 'tipoDePersona']
  ),
  -- Pesos con centavos; nunca float (ADR-0005). El dominio limita el total a $1.000.000.000.
  base numeric(14, 2) NOT NULL CHECK (base >= 0),
  iva numeric(14, 2) NOT NULL CHECK (iva >= 0),
  total numeric(14, 2) NOT NULL CHECK (total > 0 AND total <= 1000000000 AND total = base + iva),
  creada_por uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  PRIMARY KEY (empresa_id, id),
  FOREIGN KEY (empresa_id, resolucion_id) REFERENCES conta.resoluciones_de_numeracion (empresa_id, id),
  -- Un número, una venta (la DIAN no admite duplicados).
  UNIQUE (empresa_id, prefijo, consecutivo)
);
--> statement-breakpoint
CREATE INDEX ventas_por_fecha ON conta.ventas (empresa_id, emitida_en);
--> statement-breakpoint
-- Defensa en profundidad (hallazgo H5): una venta solo usa un número ya reservado de su resolución, con su prefijo.
CREATE FUNCTION conta_sistema.venta_con_numero_reservado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conta.resoluciones_de_numeracion r
     WHERE r.empresa_id = NEW.empresa_id AND r.id = NEW.resolucion_id AND r.prefijo = NEW.prefijo
       AND NEW.consecutivo BETWEEN r.desde AND r.siguiente - 1
  ) THEN
    RAISE EXCEPTION 'La venta no tiene un número reservado de su resolución' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER venta_con_numero_reservado BEFORE INSERT ON conta.ventas
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.venta_con_numero_reservado();
--> statement-breakpoint
ALTER TABLE conta.ventas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.ventas FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY ventas_de_la_empresa_actual ON conta.ventas
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.ventas TO conta_api;
--> statement-breakpoint

CREATE TABLE conta.lineas_de_venta (
  empresa_id uuid NOT NULL,
  venta_id uuid NOT NULL,
  orden smallint NOT NULL CHECK (orden BETWEEN 1 AND 100),
  producto_id uuid NOT NULL,
  descripcion text NOT NULL CHECK (char_length(descripcion) BETWEEN 1 AND 300 AND descripcion !~ '[\x01-\x1f\x7f-\x9f]'),
  codigo text CHECK (codigo ~ '^[A-Z0-9._-]{1,40}$'),
  unidad text NOT NULL CHECK (unidad IN ('94', 'KGM', 'GRM', 'LBR', 'LTR', 'MLT', 'MTR', 'HUR')),
  cantidad numeric(13, 6) NOT NULL CHECK (cantidad > 0),
  -- Precio de una unidad con IVA incluido, copiado del catálogo al vender.
  precio numeric(12, 2) NOT NULL CHECK (precio > 0),
  tipo_de_iva text NOT NULL CHECK (tipo_de_iva IN ('gravado', 'exento', 'excluido')),
  tarifa_iva text CHECK (tarifa_iva IN ('19', '5', '0')),
  base numeric(14, 2) NOT NULL CHECK (base >= 0),
  iva numeric(14, 2) NOT NULL CHECK (iva >= 0),
  total numeric(14, 2) NOT NULL CHECK (total > 0 AND total = base + iva),
  PRIMARY KEY (empresa_id, venta_id, orden),
  FOREIGN KEY (empresa_id, venta_id) REFERENCES conta.ventas (empresa_id, id),
  CHECK (
    (tipo_de_iva, coalesce(tarifa_iva, 'ninguna'))
      IN (('gravado', '19'), ('gravado', '5'), ('exento', '0'), ('excluido', 'ninguna'))
  ),
  CHECK (tipo_de_iva = 'gravado' OR iva = 0)
);
--> statement-breakpoint
ALTER TABLE conta.lineas_de_venta ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.lineas_de_venta FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY lineas_de_venta_de_la_empresa_actual ON conta.lineas_de_venta
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.lineas_de_venta TO conta_api;
--> statement-breakpoint
-- Al confirmar, toda venta tiene al menos una línea y sus líneas suman exactamente la base, el IVA y el total.
CREATE FUNCTION conta_sistema.venta_cuadra_con_sus_lineas() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sumas record;
BEGIN
  SELECT count(*) AS cuantas, coalesce(sum(base), 0) AS base, coalesce(sum(iva), 0) AS iva, coalesce(sum(total), 0) AS total
    INTO sumas FROM conta.lineas_de_venta l WHERE l.empresa_id = NEW.empresa_id AND l.venta_id = NEW.id;
  IF sumas.cuantas = 0 OR sumas.base <> NEW.base OR sumas.iva <> NEW.iva OR sumas.total <> NEW.total THEN
    RAISE EXCEPTION 'La venta no cuadra con sus líneas' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER venta_cuadra_con_sus_lineas AFTER INSERT ON conta.ventas
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.venta_cuadra_con_sus_lineas();
--> statement-breakpoint

-- 4. Qué envío a la DIAN lleva cada venta. Se inserta cuando el documento ya quedó firmado y en cola.
CREATE TABLE conta.emisiones_de_venta (
  empresa_id uuid NOT NULL,
  venta_id uuid NOT NULL,
  envio_id uuid NOT NULL,
  PRIMARY KEY (empresa_id, venta_id),
  UNIQUE (empresa_id, envio_id),
  FOREIGN KEY (empresa_id, venta_id) REFERENCES conta.ventas (empresa_id, id),
  FOREIGN KEY (empresa_id, envio_id) REFERENCES conta.envios_dian (empresa_id, id)
);
--> statement-breakpoint
ALTER TABLE conta.emisiones_de_venta ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.emisiones_de_venta FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY emisiones_de_venta_de_la_empresa_actual ON conta.emisiones_de_venta
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.emisiones_de_venta TO conta_api;
--> statement-breakpoint

-- 5. Ventas guardadas cuyo documento falta firmar y encolar (si la firma falló o la API se reinició a mitad).
--    Como la cola de envíos (ADR-0008), vive en conta_sistema sin RLS: el reparador la lee para todas las empresas.
--    Solo guarda ids, la hora, los intentos y el código de la última falla (nunca su mensaje ni datos del negocio).
--    Dentro de una petición, la API la filtra siempre por conta_sistema.empresa_actual().
CREATE TABLE conta_sistema.cola_emision_ventas (
  empresa_id uuid NOT NULL,
  venta_id uuid NOT NULL,
  ejecutar_en timestamptz NOT NULL,
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  ultima_falla text CHECK (ultima_falla ~ '^[A-Za-z0-9._-]{1,64}$'),
  PRIMARY KEY (empresa_id, venta_id),
  FOREIGN KEY (empresa_id, venta_id) REFERENCES conta.ventas (empresa_id, id)
);
--> statement-breakpoint
CREATE INDEX cola_emision_ventas_por_hora ON conta_sistema.cola_emision_ventas (ejecutar_en);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON conta_sistema.cola_emision_ventas TO conta_api;
--> statement-breakpoint

-- 6. El cupo diario por persona también cuenta ventas (tope contra un guion que agote el rango).
ALTER TABLE conta_sistema.cupos_diarios DROP CONSTRAINT cupos_diarios_recurso_check;
--> statement-breakpoint
ALTER TABLE conta_sistema.cupos_diarios ADD CONSTRAINT cupos_diarios_recurso_check CHECK (recurso IN ('productos', 'ventas'));
