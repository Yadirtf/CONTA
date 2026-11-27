import { bigint, boolean, date, jsonb, numeric, pgSchema, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablas de ventas y numeración para consultar con Drizzle. Se crean en migraciones/0009_ventas.sql.
// Dinero y cantidades: numeric en modo texto, nunca number (ADR-0005).

const conta = pgSchema('conta');
const dinero = (nombre: string) => numeric(nombre, { precision: 14, scale: 2, mode: 'string' }).notNull();

export const datosFiscales = conta.table('datos_fiscales', {
  empresaId: uuid('empresa_id').notNull(),
  nit: text('nit').notNull(),
  razonSocial: text('razon_social').notNull(),
  tipoDePersona: text('tipo_de_persona').notNull(),
  responsabilidadesFiscales: text('responsabilidades_fiscales').array().notNull(),
  responsableDeIva: boolean('responsable_de_iva').notNull(),
  codigoMunicipio: text('codigo_municipio').notNull(),
  ciudad: text('ciudad').notNull(),
  departamento: text('departamento').notNull(),
  direccion: text('direccion').notNull(),
  correo: text('correo'),
});

export const resoluciones = conta.table('resoluciones_de_numeracion', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').notNull(),
  numero: text('numero').notNull(),
  prefijo: text('prefijo').notNull(),
  desde: bigint('desde', { mode: 'number' }).notNull(),
  hasta: bigint('hasta', { mode: 'number' }).notNull(),
  vigenteDesde: date('vigente_desde', { mode: 'string' }).notNull(),
  vigenteHasta: date('vigente_hasta', { mode: 'string' }).notNull(),
  siguiente: bigint('siguiente', { mode: 'number' }).notNull(),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull(),
});

export const ventas = conta.table('ventas', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').notNull(),
  huella: text('huella').notNull(),
  resolucionId: uuid('resolucion_id').notNull(),
  prefijo: text('prefijo').notNull(),
  consecutivo: bigint('consecutivo', { mode: 'number' }).notNull(),
  emitidaEn: timestamp('emitida_en', { withTimezone: true }).notNull(),
  medioDePago: text('medio_de_pago').notNull(),
  comprador: jsonb('comprador').notNull(),
  base: dinero('base'),
  iva: dinero('iva'),
  total: dinero('total'),
  creadaPor: uuid('creada_por').notNull(),
});

export const lineasDeVenta = conta.table('lineas_de_venta', {
  empresaId: uuid('empresa_id').notNull(),
  ventaId: uuid('venta_id').notNull(),
  orden: smallint('orden').notNull(),
  productoId: uuid('producto_id').notNull(),
  descripcion: text('descripcion').notNull(),
  codigo: text('codigo'),
  unidad: text('unidad').notNull(),
  cantidad: numeric('cantidad', { precision: 13, scale: 6, mode: 'string' }).notNull(),
  precio: numeric('precio', { precision: 12, scale: 2, mode: 'string' }).notNull(),
  tipoDeIva: text('tipo_de_iva').notNull(),
  tarifaIva: text('tarifa_iva'),
  base: dinero('base'),
  iva: dinero('iva'),
  total: dinero('total'),
});

export const emisionesDeVenta = conta.table('emisiones_de_venta', {
  empresaId: uuid('empresa_id').notNull(),
  ventaId: uuid('venta_id').notNull(),
  envioId: uuid('envio_id').notNull(),
});

export type FilaDeVenta = typeof ventas.$inferSelect;
export type FilaDeLinea = typeof lineasDeVenta.$inferSelect;
export type FilaDeDatosFiscales = typeof datosFiscales.$inferSelect;
export type FilaDeResolucion = typeof resoluciones.$inferSelect;
