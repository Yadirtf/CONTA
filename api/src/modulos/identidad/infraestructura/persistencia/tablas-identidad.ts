import { integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablas de identidad para consultar con Drizzle. Se crean en migraciones/0003_identidad.sql.

const identidad = pgSchema('conta_identidad');
const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true });

export const usuarios = identidad.table('usuarios', {
  id: uuid('id').primaryKey(),
  celular: text('celular').notNull(),
  creadoEn: fecha('creado_en').notNull(),
});

export const accesos = identidad.table('accesos', {
  celular: text('celular').primaryKey(),
  huellaCodigo: text('huella_codigo'),
  codigoVenceEn: fecha('codigo_vence_en'),
  fallos: integer('fallos').notNull(),
  bloqueadoHasta: fecha('bloqueado_hasta'),
  ventanaDesde: fecha('ventana_desde'),
  codigosEnVentana: integer('codigos_en_ventana').notNull(),
  ultimoCodigoEn: fecha('ultimo_codigo_en'),
  actualizadoEn: fecha('actualizado_en').notNull(),
});

export const sesiones = identidad.table('sesiones', {
  id: uuid('id').primaryKey(),
  usuarioId: uuid('usuario_id').notNull(),
  huellaToken: text('huella_token').notNull(),
  creadaEn: fecha('creada_en').notNull(),
  venceEn: fecha('vence_en').notNull(),
  revocadaEn: fecha('revocada_en'),
});
