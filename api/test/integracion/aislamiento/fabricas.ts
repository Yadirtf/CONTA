import type pg from 'pg';
import { comoEmpresa, nuevoId } from './base-de-pruebas.js';
import { FABRICAS_DE_CORREOS } from './fabricas-de-correos.js';

/**
 * Registro de tablas de negocio para la prueba de aislamiento (HU-01.05).
 * TODA tabla de los esquemas de negocio debe estar aquí: la prueba de catálogo falla si falta una.
 * Cada fábrica inserta una fila válida de la empresa dada (creando antes lo que necesite) y devuelve su id.
 */
export interface FabricaDeFilas {
  /** Columna con la llave de empresa: empresa_id en todas, salvo empresas (su propio id). */
  readonly columnaEmpresa: string;
  /** Columna que identifica la fila insertada. */
  readonly columnaId: string;
  /**
   * true si conta_api no puede cambiar la columna de empresa (UPDATE por columnas o sin UPDATE): la prueba
   * exige entonces que el cambio se niegue por permisos, una garantía más fuerte que la de RLS.
   */
  readonly empresaInmutable?: boolean;
  /**
   * true si conta_api solo lee la tabla (la llena el comando configurar-facturacion como conta_app). La fila se
   * inserta entonces con la conexión del dueño (DATABASE_URL_DUENO), se confirma y se borra al terminar.
   */
  readonly delDueno?: boolean;
  insertar(cliente: pg.Client, empresaId: string): Promise<string>;
}

const CUFE_DE_PRUEBA = 'a'.repeat(96);

/** Inserta un envío a la DIAN de la empresa (HU-02.03). */
export async function crearEnvioDian(cliente: pg.Client, empresaId: string): Promise<string> {
  await prepararEmpresa(cliente, empresaId);
  return insertarEnvioDian(cliente, empresaId);
}

/** Inserta un envío en una empresa que ya existe; deja la transacción como esa empresa. */
export async function insertarEnvioDian(cliente: pg.Client, empresaId: string): Promise<string> {
  await comoEmpresa(cliente, empresaId);
  const id = nuevoId();
  await cliente.query(
    `INSERT INTO conta.envios_dian (empresa_id, id, cufe, numero, nit_emisor, anio, consecutivo, xml_firmado, estado)
     VALUES ($1, $2, $3, 'SETP990000001', '900373076', 2026, 1, $4, 'pendiente')`,
    [empresaId, id, CUFE_DE_PRUEBA, xmlDeTipo('01')],
  );
  return id;
}

/** El mínimo XML que la base acepta como envío (HU-06.02): un Invoice con su InvoiceTypeCode. */
export const xmlDeTipo = (codigo: string, extra = ''): string =>
  '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ' +
  'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">' +
  `<cbc:InvoiceTypeCode>${codigo}</cbc:InvoiceTypeCode>${extra}</Invoice>`;

/** Inserta una persona de conta_identidad (sin empresa ni RLS) y devuelve su id. */
export async function crearUsuario(cliente: pg.Client): Promise<string> {
  const id = nuevoId();
  const celular = `+573${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  await cliente.query('INSERT INTO conta_identidad.usuarios (id, celular) VALUES ($1, $2)', [id, celular]);
  return id;
}

export async function crearEmpresa(cliente: pg.Client, empresaId: string): Promise<void> {
  await comoEmpresa(cliente, empresaId);
  await cliente.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
}

/** Datos fiscales de la empresa (HU-06.01). Con la conexión del dueño. */
export async function crearDatosFiscales(dueno: pg.Client, empresaId: string): Promise<string> {
  await dueno.query(
    `INSERT INTO conta.datos_fiscales (empresa_id, nit, razon_social, tipo_de_persona, responsabilidades_fiscales,
       responsable_de_iva, codigo_municipio, ciudad, departamento, direccion)
     VALUES ($1, '900373076', 'Tienda de Prueba S.A.S.', 'juridica', '{O-13}', true, '11001', 'Bogotá, D.C.', 'Bogotá', 'Calle 1 # 2-3')`,
    [empresaId],
  );
  return empresaId;
}

/** Resolución de numeración de la empresa (HU-06.01). Con la conexión del dueño. */
/** Resolución de factura (SETP) por omisión; HU-06.02: `{ prefijo: 'EPOS', clase: 'pos' }` para el tiquete POS. */
export async function crearResolucion(
  dueno: pg.Client,
  empresaId: string,
  desde = 990000000,
  hasta = 995000000,
  { prefijo = 'SETP', clase = 'factura' }: { prefijo?: string; clase?: 'factura' | 'pos' } = {},
): Promise<string> {
  const id = nuevoId();
  await dueno.query(
    `INSERT INTO conta.resoluciones_de_numeracion (empresa_id, id, numero, prefijo, desde, hasta, vigente_desde, vigente_hasta, siguiente, clase)
     VALUES ($1, $2, '18760000001', $5, $3, $4, '2019-01-19', '2030-01-19', $3, $6)`,
    [empresaId, id, desde, hasta, prefijo, clase],
  );
  return id;
}

const COMPRADOR_DE_PRUEBA = JSON.stringify({
  tipoIdentificacion: '13',
  numero: '222222222222',
  razonSocial: 'Consumidor final',
  tipoDePersona: 'natural',
});

/**
 * Inserta una venta de una línea en una empresa que ya tiene resolución, con un número reservado como lo hace la
 * API (los disparadores lo exigen). La transacción queda como esa empresa.
 */
export async function insertarVenta(
  cliente: pg.Client,
  empresaId: string,
  resolucionId: string,
  comprador: string = COMPRADOR_DE_PRUEBA,
): Promise<string> {
  await comoEmpresa(cliente, empresaId);
  const creadaPor = await crearUsuario(cliente);
  const id = nuevoId();
  const { rows } = await cliente.query<{ consecutivo: string }>(
    `UPDATE conta.resoluciones_de_numeracion SET siguiente = siguiente + 1 WHERE empresa_id = $1 AND id = $2
     RETURNING siguiente - 1 AS consecutivo`,
    [empresaId, resolucionId],
  );
  await cliente.query(
    `INSERT INTO conta.ventas (empresa_id, id, huella, resolucion_id, prefijo, consecutivo, emitida_en, medio_de_pago,
       comprador, base, iva, total, creada_por)
     VALUES ($1, $2, $3, $4, 'SETP', $5, now(), 'efectivo', $6, 2100.84, 399.16, 2500, $7)`,
    [empresaId, id, 'b'.repeat(64), resolucionId, rows[0]?.consecutivo, comprador, creadaPor],
  );
  await cliente.query(
    `INSERT INTO conta.lineas_de_venta (empresa_id, venta_id, orden, producto_id, descripcion, unidad, cantidad, precio,
       tipo_de_iva, tarifa_iva, base, iva, total)
     VALUES ($1, $2, 1, $3, 'Gaseosa', '94', 1, 2500, 'gravado', '19', 2100.84, 399.16, 2500)`,
    [empresaId, id, nuevoId()],
  );
  return id;
}

export const FABRICAS: Readonly<Record<string, FabricaDeFilas>> = {
  'conta.empresas': {
    columnaEmpresa: 'id',
    columnaId: 'id',
    async insertar(cliente, empresaId) {
      await crearEmpresa(cliente, empresaId);
      return empresaId;
    },
  },
  'conta.envios_dian': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    insertar: crearEnvioDian,
  },
  'conta.membresias': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    async insertar(cliente, empresaId) {
      await prepararEmpresa(cliente, empresaId);
      const usuarioId = await crearUsuario(cliente);
      const id = nuevoId();
      await cliente.query(
        `INSERT INTO conta.membresias (id, empresa_id, usuario_id, rol, modo, aceptada_en) VALUES ($1, $2, $3, 'dueno', 'simple', now())`,
        [id, empresaId, usuarioId],
      );
      return id;
    },
  },
  'conta.clientes': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    async insertar(cliente, empresaId) {
      await prepararEmpresa(cliente, empresaId);
      const creadoPor = await crearUsuario(cliente);
      const id = nuevoId();
      await cliente.query(
        `INSERT INTO conta.clientes (empresa_id, id, tipo_identificacion, numero, nombre, tipo_de_persona,
                                     responsabilidades_fiscales, responsable_de_iva, creado_por)
         VALUES ($1, $2, '13', $3, 'Rosa Pérez', 'natural', '{R-99-PN}', false, $4)`,
        [empresaId, id, String(Math.floor(Math.random() * 1e9)), creadoPor],
      );
      return id;
    },
  },
  'conta.productos': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    async insertar(cliente, empresaId) {
      await prepararEmpresa(cliente, empresaId);
      const creadoPor = await crearUsuario(cliente);
      const id = nuevoId();
      await cliente.query(
        `INSERT INTO conta.productos (empresa_id, id, nombre, nombre_busqueda, unidad, precio, tipo_de_iva, tarifa_iva, creado_por)
         VALUES ($1, $2, 'Gaseosa 400 ml', 'gaseosa 400 ml', '94', 2500, 'gravado', '19', $3)`,
        [empresaId, id, creadoPor],
      );
      return id;
    },
  },
  'conta.intentos_envio_dian': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    async insertar(cliente, empresaId) {
      const envioId = await crearEnvioDian(cliente, empresaId);
      const id = nuevoId();
      await cliente.query(
        `INSERT INTO conta.intentos_envio_dian (empresa_id, id, envio_id, numero, operacion, resultado, detalle, duracion_ms, ocurrido_en)
         VALUES ($1, $2, $3, 1, 'SendTestSetAsync', 'recibido', 'ZipKey de prueba', 10, now())`,
        [empresaId, id, envioId],
      );
      return id;
    },
  },
  'conta.datos_fiscales': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'empresa_id',
    empresaInmutable: true,
    delDueno: true,
    async insertar(dueno, empresaId) {
      await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
      return crearDatosFiscales(dueno, empresaId);
    },
  },
  'conta.resoluciones_de_numeracion': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    delDueno: true,
    async insertar(dueno, empresaId) {
      await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
      return crearResolucion(dueno, empresaId);
    },
  },
  // Las ventas y sus hijas necesitan una resolución, que conta_api no puede crear: se insertan como dueño.
  'conta.ventas': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    delDueno: true,
    async insertar(dueno, empresaId) {
      await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
      return insertarVenta(dueno, empresaId, await crearResolucion(dueno, empresaId));
    },
  },
  'conta.lineas_de_venta': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'venta_id',
    empresaInmutable: true,
    delDueno: true,
    async insertar(dueno, empresaId) {
      await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
      // insertarVenta ya deja su línea (orden 1): toda venta tiene al menos una.
      return insertarVenta(dueno, empresaId, await crearResolucion(dueno, empresaId));
    },
  },
  'conta.emisiones_de_venta': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'venta_id',
    empresaInmutable: true,
    delDueno: true,
    async insertar(dueno, empresaId) {
      await dueno.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
      const ventaId = await insertarVenta(dueno, empresaId, await crearResolucion(dueno, empresaId));
      const envioId = await insertarEnvioDian(dueno, empresaId);
      await dueno.query('INSERT INTO conta.emisiones_de_venta (empresa_id, venta_id, envio_id) VALUES ($1, $2, $3)', [empresaId, ventaId, envioId]);
      return ventaId;
    },
  },
  ...FABRICAS_DE_CORREOS,
};

/** Para tablas hijas: crea la empresa (si es nueva) y deja la transacción como esa empresa. */
export async function prepararEmpresa(cliente: pg.Client, empresaId: string = nuevoId()): Promise<string> {
  await crearEmpresa(cliente, empresaId);
  return empresaId;
}
