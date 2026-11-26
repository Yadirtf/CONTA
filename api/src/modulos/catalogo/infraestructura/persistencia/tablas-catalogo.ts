import { boolean, numeric, pgSchema, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablas del catálogo para consultar con Drizzle. Se crean en migraciones/0007_clientes.sql y 0008_productos.sql.

const conta = pgSchema('conta');

export const clientes = conta.table('clientes', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').notNull(),
  tipoIdentificacion: text('tipo_identificacion').notNull(),
  numero: text('numero').notNull(),
  digitoVerificacion: smallint('digito_verificacion'),
  nombre: text('nombre').notNull(),
  tipoDePersona: text('tipo_de_persona').notNull(),
  responsabilidadesFiscales: text('responsabilidades_fiscales').array().notNull(),
  responsableDeIva: boolean('responsable_de_iva').notNull(),
  correo: text('correo'),
  codigoMunicipio: text('codigo_municipio'),
  ciudad: text('ciudad'),
  departamento: text('departamento'),
  direccion: text('direccion'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull(),
  creadoPor: uuid('creado_por').notNull(),
});

export type FilaDeCliente = typeof clientes.$inferSelect;
export type FilaNuevaDeCliente = typeof clientes.$inferInsert;

export const productos = conta.table('productos', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').notNull(),
  nombre: text('nombre').notNull(),
  nombreBusqueda: text('nombre_busqueda').notNull(),
  codigo: text('codigo'),
  unidad: text('unidad').notNull(),
  // Dinero: numeric en modo texto, nunca number (ADR-0005).
  precio: numeric('precio', { precision: 12, scale: 2, mode: 'string' }).notNull(),
  tipoDeIva: text('tipo_de_iva').notNull(),
  tarifaIva: text('tarifa_iva'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull(),
  creadoPor: uuid('creado_por').notNull(),
});

export type FilaDeProducto = typeof productos.$inferSelect;
export type FilaNuevaDeProducto = typeof productos.$inferInsert;
