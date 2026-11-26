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
  -- Letras y dígitos de cualquier alfabeto (hallazgo N3), con un espacio entre palabras. Nunca vacío ni en blanco
  -- (hallazgos H2 y O9) y nunca con comodines de LIKE.
  nombre_busqueda text NOT NULL CHECK (
    char_length(nombre_busqueda) BETWEEN 1 AND 300
    AND nombre_busqueda = btrim(nombre_busqueda)
    AND nombre_busqueda !~ '([%_\\]|\s\s|[\x01-\x1f\x7f-\x9f])'
  ),
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
  -- Gravado lleva 19 o 5; exento, 0 %; excluido no tiene tarifa. Con coalesce, porque con tarifa NULL un «IN» o un
  -- «=» dan NULL y un CHECK que da NULL deja pasar la fila (hallazgo H1 de la prueba de ataque).
  CHECK (
    (tipo_de_iva, coalesce(tarifa_iva, 'ninguna'))
      IN (('gravado', '19'), ('gravado', '5'), ('exento', '0'), ('excluido', 'ninguna'))
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
--> statement-breakpoint
-- Cupo diario de cada persona sumando todas sus empresas (hallazgos H3 y N1 de la prueba de ataque). El tope por
-- empresa no alcanza: con RLS no ve las otras empresas de la persona. Vive en conta_sistema y no tiene RLS, como
-- la cola de la DIAN: la llave es la persona, no una empresa, y no guarda datos del negocio, solo cuántas altas
-- lleva en el día de Colombia. Se gasta con un UPSERT atómico dentro de la transacción del alta.
CREATE TABLE conta_sistema.cupos_diarios (
  usuario_id uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  recurso text NOT NULL CHECK (recurso IN ('productos')),
  dia date NOT NULL,
  usados integer NOT NULL CHECK (usados BETWEEN 1 AND 100000),
  PRIMARY KEY (usuario_id, recurso, dia)
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON conta_sistema.cupos_diarios TO conta_api;
