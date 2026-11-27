import { integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablas del correo de la factura para consultar con Drizzle. Se crean en migraciones/0010_comprobantes_y_correos.sql.

const conta = pgSchema('conta');

export const correosDeFactura = conta.table('correos_de_factura', {
  empresaId: uuid('empresa_id').notNull(),
  ventaId: uuid('venta_id').notNull(),
  estado: text('estado').notNull(),
  intentos: integer('intentos').notNull(),
  proximoIntentoEn: timestamp('proximo_intento_en', { withTimezone: true }),
  ultimaFalla: text('ultima_falla'),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull(),
});

export const intentosCorreoDeFactura = conta.table('intentos_correo_de_factura', {
  empresaId: uuid('empresa_id').notNull(),
  ventaId: uuid('venta_id').notNull(),
  numero: integer('numero').notNull(),
  resultado: text('resultado').notNull(),
  detalle: text('detalle').notNull(),
  duracionMs: integer('duracion_ms').notNull(),
  ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull(),
});
