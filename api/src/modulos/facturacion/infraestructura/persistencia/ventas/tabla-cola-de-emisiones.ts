import { integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// conta_sistema.cola_emision_ventas (migración 0009): ids, hora, intentos y el código de la última falla, sin RLS (ADR-0008).
export const colaEmisionVentas = pgSchema('conta_sistema').table('cola_emision_ventas', {
  empresaId: uuid('empresa_id').notNull(),
  ventaId: uuid('venta_id').notNull(),
  ejecutarEn: timestamp('ejecutar_en', { withTimezone: true }).notNull(),
  intentos: integer('intentos').notNull(),
  ultimaFalla: text('ultima_falla'),
});
