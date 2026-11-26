-- HU-05.01 Buscar cliente por cédula o NIT.
-- Corre como conta_app. Compradores de cada empresa con los campos mínimos que la DIAN pide del adquirente.
-- Tabla de negocio: empresa_id, RLS forzado y política de la empresa actual (ADR-0006). Las facturas copian
-- estos datos al emitirse, así que un cliente nunca cambia un documento ya enviado.
-- El consumidor final (222222222222) no es una fila: es igual para todas las empresas y vive en el dominio.

CREATE TABLE conta.clientes (
  empresa_id uuid NOT NULL REFERENCES conta.empresas (id),
  -- Lo elige la app (crear es idempotente). La llave empieza por empresa_id: un id repetido en otra empresa
  -- no choca, así que el choque no delata que el id exista en otra empresa.
  id uuid NOT NULL,
  tipo_identificacion text NOT NULL CHECK (tipo_identificacion IN ('11', '12', '13', '21', '22', '31', '41', '42', '50', '91')),
  -- Mismas reglas que el dominio: letras A-Z y dígitos; cédula, tarjeta de identidad y cédula de extranjería
  -- sin ceros adelante; el número del consumidor final, reservado aun con ceros adelante.
  numero text NOT NULL CHECK (
    numero ~ '^[A-Z0-9]{1,20}$' AND ltrim(numero, '0') <> '222222222222'
    AND (tipo_identificacion NOT IN ('12', '13', '22') OR numero ~ '^[1-9][0-9]{0,19}$')
  ),
  digito_verificacion smallint CHECK (digito_verificacion BETWEEN 0 AND 9),
  -- Los textos llegan limpios del dominio (sin controles C0 ni C1); la tabla lo vuelve a exigir.
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 450 AND nombre !~ '[\x01-\x1f\x7f-\x9f]'),
  -- Una persona jurídica se identifica con NIT (31) o NIT de otro país (50).
  tipo_de_persona text NOT NULL CHECK (tipo_de_persona = 'natural' OR tipo_identificacion IN ('31', '50')),
  -- Lista cerrada de responsabilidades de la factura electrónica.
  responsabilidades_fiscales text[] NOT NULL CHECK (
    cardinality(responsabilidades_fiscales) BETWEEN 1 AND 4
    AND responsabilidades_fiscales <@ ARRAY['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN']
  ),
  responsable_de_iva boolean NOT NULL,
  -- ASCII imprimible, sin espacios ni < > ".
  correo text CHECK (
    char_length(correo) <= 254 AND correo ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'
  ),
  codigo_municipio text CHECK (codigo_municipio ~ '^[0-9]{5}$' AND right(codigo_municipio, 3) <> '000'),
  ciudad text CHECK (char_length(ciudad) BETWEEN 1 AND 200 AND ciudad !~ '[\x01-\x1f\x7f-\x9f]'),
  departamento text CHECK (char_length(departamento) BETWEEN 1 AND 200 AND departamento !~ '[\x01-\x1f\x7f-\x9f]'),
  direccion text CHECK (char_length(direccion) BETWEEN 1 AND 200 AND direccion !~ '[\x01-\x1f\x7f-\x9f]'),
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid NOT NULL REFERENCES conta_identidad.usuarios (id),
  PRIMARY KEY (empresa_id, id),
  -- El NIT lleva dígito de verificación y los demás documentos no.
  CHECK ((tipo_identificacion = '31' AND numero ~ '^[1-9][0-9]{2,14}$') = (digito_verificacion IS NOT NULL)),
  -- La dirección va completa o no va.
  CHECK (num_nulls(codigo_municipio, ciudad, departamento, direccion) IN (0, 4))
);
--> statement-breakpoint
-- Un documento, un comprador por empresa.
CREATE UNIQUE INDEX clientes_por_documento ON conta.clientes (empresa_id, tipo_identificacion, numero);
--> statement-breakpoint
-- Búsqueda por el comienzo del número (LIKE 'prefijo%'), de cualquier tipo de documento.
CREATE INDEX clientes_por_prefijo ON conta.clientes (empresa_id, numero text_pattern_ops);
--> statement-breakpoint
-- Tope diario de compradores nuevos.
CREATE INDEX clientes_por_creacion ON conta.clientes (empresa_id, creado_en);
--> statement-breakpoint
ALTER TABLE conta.clientes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conta.clientes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY clientes_de_la_empresa_actual ON conta.clientes
  TO conta_api
  USING (empresa_id = conta_sistema.empresa_actual())
  WITH CHECK (empresa_id = conta_sistema.empresa_actual());
--> statement-breakpoint
-- Sin UPDATE ni DELETE por ahora: esta historia solo busca y crea. Editar y borrar (Ley 1581) llegan con su historia.
GRANT SELECT, INSERT ON conta.clientes TO conta_api;
