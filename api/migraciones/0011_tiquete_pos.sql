-- HU-06.02 POS electrónico: la clase de documento (factura electrónica o tiquete POS electrónico) en las
-- resoluciones, las ventas y los envíos a la DIAN (ADR-0016). Corre como conta_app.
-- La clase la fija la resolución: la DIAN autoriza cada rango para un tipo de documento, así que una venta POS solo
-- puede tomar un número de una resolución POS. conta_api no puede cambiar la clase de nada: solo la lee o la inserta.

-- 1. Resoluciones. Las que ya existen son de factura.
ALTER TABLE conta.resoluciones_de_numeracion
  ADD COLUMN clase text NOT NULL DEFAULT 'factura' CHECK (clase IN ('factura', 'pos'));
--> statement-breakpoint
-- Para que la venta pueda apuntar a la resolución junto con su clase (llave foránea compuesta).
ALTER TABLE conta.resoluciones_de_numeracion
  ADD CONSTRAINT resoluciones_empresa_id_clase_key UNIQUE (empresa_id, id, clase);
--> statement-breakpoint

-- 2. Ventas. Las que ya existen se emitieron con factura (el valor por omisión). La API dice siempre la clase, y la
--    llave foránea impide una venta POS con número de factura o al revés, venga de donde venga la inserción.
ALTER TABLE conta.ventas
  ADD COLUMN clase text NOT NULL DEFAULT 'factura' CHECK (clase IN ('factura', 'pos'));
--> statement-breakpoint
ALTER TABLE conta.ventas
  ADD CONSTRAINT ventas_resolucion_de_su_clase
  FOREIGN KEY (empresa_id, resolucion_id, clase) REFERENCES conta.resoluciones_de_numeracion (empresa_id, id, clase);
--> statement-breakpoint

-- Defensa en profundidad: el tiquete POS no pasa de 5 UVT sin impuestos (ET art. 616-1, parágrafo 2). La regla vive
-- en el dominio (tope-del-pos.ts); aquí se repite la tabla de UVT para que ni un error del código ni una inserción
-- directa la salten. Un año sin valor usa el último conocido (la UVT nunca baja), igual que el dominio.
-- 2026: $52.374 (Resolución DIAN 000238 de 2025). Al agregar un año, cambiar las dos tablas y su prueba.
CREATE FUNCTION conta_sistema.tope_del_pos(fecha date) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT 5 * uvt FROM (VALUES (2026, 52374::numeric)) AS t (anio, uvt)
   WHERE anio <= extract(year FROM fecha)
   ORDER BY anio DESC
   LIMIT 1
$$;
--> statement-breakpoint
CREATE FUNCTION conta_sistema.tiquete_pos_dentro_del_tope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  tope numeric;
BEGIN
  IF NEW.clase = 'pos' THEN
    tope := conta_sistema.tope_del_pos((NEW.emitida_en AT TIME ZONE 'America/Bogota')::date);
    IF tope IS NULL OR NEW.base > tope THEN
      RAISE EXCEPTION 'El tiquete POS pasa de 5 UVT sin impuestos' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER tiquete_pos_dentro_del_tope BEFORE INSERT ON conta.ventas
  FOR EACH ROW EXECUTE FUNCTION conta_sistema.tiquete_pos_dentro_del_tope();
--> statement-breakpoint

-- 3. Envíos a la DIAN. La clase decide con qué set de pruebas se envía. Tiene que coincidir con el documento firmado,
--    leído como XML y no como texto (hallazgo H1 de la prueba de ataque: un código en un comentario, en otra etiqueta o
--    con espacios engañaba a una búsqueda de texto). El Invoice debe traer un solo InvoiceTypeCode: 01 es factura y
--    20 es tiquete POS; cualquier otra cosa, o un XML que no se puede leer, no entra. conta_api no puede actualizar la
--    columna (sus permisos de UPDATE son solo las columnas de estado, migración 0002).
CREATE FUNCTION conta_sistema.clase_del_xml(xml_firmado text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN cardinality(codigos) = 1 THEN
           CASE codigos[1]::text WHEN '01' THEN 'factura' WHEN '20' THEN 'pos' END
         END
    FROM (SELECT xpath(
            '/i:Invoice/cbc:InvoiceTypeCode/text()',
            xml_firmado::xml,
            ARRAY[ARRAY['i', 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'],
                  ARRAY['cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2']]
          ) AS codigos) AS t
$$;
--> statement-breakpoint
ALTER TABLE conta.envios_dian
  ADD COLUMN clase text NOT NULL DEFAULT 'factura' CHECK (clase IN ('factura', 'pos'));
--> statement-breakpoint
ALTER TABLE conta.envios_dian
  ADD CONSTRAINT envios_dian_clase_del_documento CHECK (conta_sistema.clase_del_xml(xml_firmado) IS NOT DISTINCT FROM clase);
--> statement-breakpoint
ALTER TABLE conta.envios_dian ADD CONSTRAINT envios_dian_empresa_id_id_clase_key UNIQUE (empresa_id, id, clase);
--> statement-breakpoint

-- 4. Una venta solo se enlaza con un envío de su misma clase: el tiquete POS de una venta no puede quedar apuntando a
--    la factura de otra.
ALTER TABLE conta.emisiones_de_venta
  ADD COLUMN clase text NOT NULL DEFAULT 'factura' CHECK (clase IN ('factura', 'pos'));
--> statement-breakpoint
ALTER TABLE conta.ventas ADD CONSTRAINT ventas_empresa_id_id_clase_key UNIQUE (empresa_id, id, clase);
--> statement-breakpoint
ALTER TABLE conta.emisiones_de_venta
  ADD CONSTRAINT emisiones_de_la_clase_de_la_venta
  FOREIGN KEY (empresa_id, venta_id, clase) REFERENCES conta.ventas (empresa_id, id, clase);
--> statement-breakpoint
ALTER TABLE conta.emisiones_de_venta
  ADD CONSTRAINT emisiones_de_la_clase_del_envio
  FOREIGN KEY (empresa_id, envio_id, clase) REFERENCES conta.envios_dian (empresa_id, id, clase);
