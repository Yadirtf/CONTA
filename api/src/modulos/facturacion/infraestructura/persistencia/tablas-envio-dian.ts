import { boolean, integer, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablas del envío a la DIAN para consultar con Drizzle. Se crean en migraciones/0002_envio_a_la_dian.sql.

const conta = pgSchema('conta');
const contaSistema = pgSchema('conta_sistema');

export const enviosDian = conta.table('envios_dian', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').primaryKey(),
  cufe: text('cufe').notNull(),
  numero: text('numero').notNull(),
  // HU-06.02: factura o pos. Se crea en migraciones/0011_tiquete_pos.sql.
  clase: text('clase').notNull(),
  nitEmisor: text('nit_emisor').notNull(),
  anio: integer('anio').notNull(),
  consecutivo: integer('consecutivo').notNull(),
  xmlFirmado: text('xml_firmado').notNull(),
  estado: text('estado').notNull(),
  zipKey: text('zip_key'),
  intentos: integer('intentos').notNull(),
  fallasSeguidas: integer('fallas_seguidas').notNull(),
  consultas: integer('consultas').notNull(),
  proximoIntentoEn: timestamp('proximo_intento_en', { withTimezone: true }),
  respuestaValida: boolean('respuesta_valida'),
  respuestaCodigo: text('respuesta_codigo'),
  respuestaDescripcion: text('respuesta_descripcion'),
  respuestaMensajes: jsonb('respuesta_mensajes').$type<string[]>().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const intentosEnvioDian = conta.table('intentos_envio_dian', {
  empresaId: uuid('empresa_id').notNull(),
  id: uuid('id').primaryKey(),
  envioId: uuid('envio_id').notNull(),
  numero: integer('numero').notNull(),
  operacion: text('operacion').notNull(),
  resultado: text('resultado').notNull(),
  detalle: text('detalle').notNull(),
  duracionMs: integer('duracion_ms').notNull(),
  ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull(),
});

export const colaEnviosDian = contaSistema.table('cola_envios_dian', {
  empresaId: uuid('empresa_id').notNull(),
  envioId: uuid('envio_id').notNull(),
  ejecutarEn: timestamp('ejecutar_en', { withTimezone: true }).notNull(),
});
