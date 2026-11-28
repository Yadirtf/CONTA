-- HU-07.04 Pantalla de configuración DIAN por empresa. El dueño carga desde la app lo que antes ponían el comando
-- configurar-facturacion y las variables DIAN_HAB_*: datos fiscales, resoluciones, software por clase de documento y
-- la preferencia «siempre factura». Corre como conta_app. Todas las tablas llevan empresa_id con RLS forzado.
-- Reglas que la base sostiene aunque la API falle:
--   * una resolución guardada no se edita ni se borra (conta_api solo inserta, y solo cambia `siguiente`);
--   * el NIT no cambia cuando la empresa ya vendió (sus ventas y envíos llevan ese NIT);
--   * el PIN y la clave técnica solo se guardan cifrados (formato v1.<iv>.<cifrado>.<etiqueta>);
--   * la bitácora de cambios solo crece.

-- 1. Datos fiscales: ahora los escribe la API. La empresa de la fila no cambia (UPDATE por columnas, sin empresa_id).
ALTER POLICY datos_fiscales_de_la_empresa_actual ON conta.datos_fiscales
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT INSERT ON conta.datos_fiscales TO conta_api;
--> statement-breakpoint
GRANT UPDATE (nit, razon_social, tipo_de_persona, responsabilidades_fiscales, responsable_de_iva, codigo_municipio,
  ciudad, departamento, direccion, correo) ON conta.datos_fiscales TO conta_api;
--> statement-breakpoint
CREATE FUNCTION conta_sistema.nit_fijo_con_ventas() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nit IS DISTINCT FROM OLD.nit AND EXISTS (SELECT 1 FROM conta.ventas v WHERE v.empresa_id = OLD.empresa_id) THEN
    RAISE EXCEPTION 'El NIT no cambia cuando la empresa ya tiene ventas'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'nit_fijo_con_ventas';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER nit_fijo_con_ventas BEFORE UPDATE OF nit ON conta.datos_fiscales
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.nit_fijo_con_ventas();
--> statement-breakpoint

-- 2. Resoluciones: la API las agrega. La DIAN da una clave técnica por rango de factura (entra al CUFE): se guarda con
--    su resolución, cifrada, y no cambia nunca. El tiquete POS no la usa.
ALTER TABLE conta.resoluciones_de_numeracion
  ADD COLUMN clave_tecnica_cifrada text CHECK (
    clave_tecnica_cifrada IS NULL
    OR (clase = 'factura' AND char_length(clave_tecnica_cifrada) <= 600 AND clave_tecnica_cifrada ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
  );
--> statement-breakpoint
-- Huella con clave (HMAC) del pedido que agregó la resolución, con su clave técnica y su primer número: repetir el
-- pedido es un reintento; el mismo id con otro contenido, un conflicto. Las anteriores a HU-07.04 no la tienen.
ALTER TABLE conta.resoluciones_de_numeracion
  ADD COLUMN huella_del_pedido text CHECK (huella_del_pedido ~ '^[A-Za-z0-9_-]{43}$');
--> statement-breakpoint
-- creada_en también: PostgreSQL pide el permiso de la columna aunque reciba su valor por omisión. El trigger de abajo
-- la fija en now(), así que la API no puede antedatar una resolución (desempata cuál es la vigente).
GRANT INSERT (empresa_id, id, numero, prefijo, desde, hasta, vigente_desde, vigente_hasta, siguiente, clase, clave_tecnica_cifrada,
  huella_del_pedido, creada_en)
  ON conta.resoluciones_de_numeracion TO conta_api;
--> statement-breakpoint
-- Una resolución nueva empieza con un número de su rango (ni antes ni ya agotada) y con la hora de la base.
CREATE FUNCTION conta_sistema.resolucion_nueva_con_numeros() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.siguiente < NEW.desde OR NEW.siguiente > NEW.hasta THEN
    RAISE EXCEPTION 'El primer número de la resolución va dentro de su rango' USING ERRCODE = 'check_violation';
  END IF;
  NEW.creada_en := now();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER resolucion_nueva_con_numeros BEFORE INSERT ON conta.resoluciones_de_numeracion
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.resolucion_nueva_con_numeros();
--> statement-breakpoint

-- 3. Software que la DIAN registró para la empresa, uno por clase de documento (modo de operación). El PIN va
--    cifrado con la empresa y la clase como dato asociado; el fabricante solo existe en el POS.
CREATE TABLE conta.software_dian (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  clase text NOT NULL CHECK (clase IN ('factura', 'pos')),
  id_software uuid NOT NULL,
  pin_cifrado text NOT NULL CHECK (
    char_length(pin_cifrado) <= 600 AND pin_cifrado ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
  ),
  -- El último carácter del PIN, para que el dueño reconozca cuál guardó sin volver a verlo completo.
  pin_final text NOT NULL CHECK (pin_final ~ '^[0-9A-Za-z]$'),
  test_set_id uuid NOT NULL,
  fabricante_nombre text CHECK (char_length(fabricante_nombre) BETWEEN 1 AND 200 AND fabricante_nombre !~ '[\x01-\x1f\x7f-\x9f]'),
  fabricante_razon_social text CHECK (
    char_length(fabricante_razon_social) BETWEEN 1 AND 200 AND fabricante_razon_social !~ '[\x01-\x1f\x7f-\x9f]'
  ),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid NOT NULL,
  PRIMARY KEY (empresa_id, clase),
  CHECK (
    (clase = 'pos' AND fabricante_nombre IS NOT NULL AND fabricante_razon_social IS NOT NULL)
    OR (clase = 'factura' AND fabricante_nombre IS NULL AND fabricante_razon_social IS NULL)
  )
);
--> statement-breakpoint
ALTER TABLE conta.software_dian ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.software_dian FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY software_dian_de_la_empresa_actual ON conta.software_dian
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.software_dian TO conta_api;
--> statement-breakpoint
GRANT UPDATE (id_software, pin_cifrado, pin_final, test_set_id, fabricante_nombre, fabricante_razon_social, actualizado_en,
  actualizado_por) ON conta.software_dian TO conta_api;
--> statement-breakpoint

-- 4. Preferencias del negocio para la facturación. «siempre factura»: nunca sale tiquete POS (ADR-0016).
CREATE TABLE conta.preferencias_de_facturacion (
  empresa_id uuid PRIMARY KEY REFERENCES conta.empresas (id),
  siempre_factura boolean NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE conta.preferencias_de_facturacion ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.preferencias_de_facturacion FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY preferencias_de_la_empresa_actual ON conta.preferencias_de_facturacion
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.preferencias_de_facturacion TO conta_api;
--> statement-breakpoint
GRANT UPDATE (siempre_factura, actualizado_en, actualizado_por) ON conta.preferencias_de_facturacion TO conta_api;
--> statement-breakpoint

-- 5. Bitácora: quién cambió qué parte de la configuración y cuándo. Nunca lleva valores (ni el PIN ni la clave).
--    conta_api solo inserta y lee: no se corrige ni se borra.
CREATE TABLE conta.cambios_de_configuracion_dian (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  id uuid NOT NULL,
  seccion text NOT NULL CHECK (
    seccion IN ('datos-fiscales', 'resolucion-factura', 'resolucion-pos', 'software-factura', 'software-pos', 'preferencias')
  ),
  hecho_por uuid NOT NULL,
  hecho_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);
--> statement-breakpoint
CREATE INDEX cambios_de_configuracion_dian_recientes ON conta.cambios_de_configuracion_dian (empresa_id, hecho_en DESC);
--> statement-breakpoint
ALTER TABLE conta.cambios_de_configuracion_dian ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.cambios_de_configuracion_dian FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY cambios_de_configuracion_de_la_empresa_actual ON conta.cambios_de_configuracion_dian
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
GRANT SELECT, INSERT ON conta.cambios_de_configuracion_dian TO conta_api;
