import { pgSchema, timestamp, uuid } from 'drizzle-orm/pg-core';

// conta_sistema.cola_emision_ventas (migración 0009): solo ids y la hora, sin RLS, como la cola de envíos.
export const colaEmisionVentas = pgSchema('conta_sistema').table('cola_emision_ventas', {
  empresaId: uuid('empresa_id').notNull(),
  ventaId: uuid('venta_id').notNull(),
  ejecutarEn: timestamp('ejecutar_en', { withTimezone: true }).notNull(),
});
