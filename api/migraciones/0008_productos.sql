-- HU-05.02 Productos con IVA ya marcado.
-- Corre como conta_app. Productos de cada empresa con su precio de venta (con IVA incluido) y cómo los trata el
-- IVA. Tabla de negocio: empresa_id, RLS forzado y política de la empresa actual (ADR-0006). Las facturas copian
-- estos datos al emitirse, así que un producto nunca cambia un documento ya enviado.

CREATE TABLE conta.productos (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  -- Lo elige la app (crear es idempotente). La llave empieza por empresa_id, como en clientes: un id repetido
  -- en otra empresa no choca y el choque no delata nada.
  id uuid NOT NULL,
  -- Los textos llegan limpios del dominio (sin controles C0 ni C1 ni «no caracteres»); la tabla lo vuelve a exigir.
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 300 AND nombre !~ '[\x01-\x1f\x7f-\x9f﷐-﷯￾￿]'),
  -- El nombre sin tildes ni mayúsculas, calculado por el dominio: la búsqueda no necesita la extensión unaccent.
  nombre_busqueda text NOT NULL CHECK (char_length(nombre_busqueda) <= 300 AND nombre_busqueda ~ '^[a-z0-9 ]*$'),
  codigo text CHECK (codigo ~ '^[A-Z0-9._-]{1,40}$'),
  -- Códigos de UN/ECE (Recomendación 20) que acepta la factura electrónica.
  unidad text NOT NULL CHECK (unidad IN ('94', 'KGM', 'GRM', 'LBR', 'LTR', 'MLT', 'MTR', 'HUR')),
  -- Precio de venta de una unidad con el IVA incluido, en pesos con centavos. Nunca float (ADR-0005).
  precio numeric(12, 2) NOT NULL CHECK (precio > 0 AND precio <= 1000000000),
  tipo_de_iva text NOT NULL CHECK (tipo_de_iva IN ('gravado', 'exento', 'excluido')),
  tarifa_iva text CHECK (tarifa_iva IN ('19', '5', '0')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  PRIMARY KEY (empresa_id, id),
  -- Gravado lleva 19 o 5; exento, 0 %; excluido no tiene tarifa.
  CHECK (
    (tipo_de_iva = 'gravado' AND tarifa_iva IN ('19', '5'))
    OR (tipo_de_iva = 'exento' AND tarifa_iva = '0')
    OR (tipo_de_iva = 'excluido' AND tarifa_iva IS NULL)
  )
);
--> statement-breakpoint
-- Un código, un producto por empresa (el de barras no se repite).
CREATE UNIQUE INDEX productos_por_codigo ON conta.productos (empresa_id, codigo) WHERE codigo IS NOT NULL;
--> statement-breakpoint
-- El listado va por nombre.
CREATE INDEX productos_por_nombre ON conta.productos (empresa_id, nombre_busqueda);
--> statement-breakpoint
-- Tope diario de productos nuevos.
CREATE INDEX productos_por_creacion ON conta.productos (empresa_id, creado_en);
--> statement-breakpoint
ALTER TABLE conta.productos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.productos FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY productos_de_la_empresa_actual ON conta.productos
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
-- Sin UPDATE ni DELETE: esta historia solo crea y lista. Cambiar el precio llega con su historia.
GRANT SELECT, INSERT ON conta.productos TO conta_api;
