import { boolean, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablas de la configuración DIAN (HU-07.04) para consultar con Drizzle. Se crean en migraciones/0012_configuracion_dian.sql.
// Los datos fiscales y las resoluciones siguen en tablas-ventas.ts: las usan también las ventas.

const conta = pgSchema('conta');

export const softwareDian = conta.table('software_dian', {
  empresaId: uuid('empresa_id').notNull(),
  clase: text('clase').notNull(),
  idSoftware: uuid('id_software').notNull(),
  pinCifrado: text('pin_cifrado').notNull(),
  pinFinal: text('pin_final').notNull(),
  testSetId: uuid('test_set_id').notNull(),
  fabricanteNombre: text('fabricante_nombre'),
  fabricanteRazonSocial: text('fabricante_razon_social'),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull(),
  actualizadoPor: uuid('actualizado_por').notNull(),
});

export const preferenciasDeFacturacion = conta.table('preferencias_de_facturacion', {
  empresaId: uuid('empresa_id').notNull(),
  siempreFactura: boolean('siempre_factura').notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull(),
  actualizadoPor: uuid('actualizado_por').notNull(),
});

export const cambiosDeConfiguracion = conta.table('cambios_de_configuracion_dian', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').notNull(),
  seccion: text('seccion').notNull(),
  hechoPor: uuid('hecho_por').notNull(),
  hechoEn: timestamp('hecho_en', { withTimezone: true }).notNull(),
});
