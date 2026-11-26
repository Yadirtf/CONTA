import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Esquema de Drizzle para consultar. Las tablas se crean con migraciones SQL a mano (api/migraciones),
// porque cada una lleva empresa_id, RLS forzado, política y permisos para conta_api (ADR-0006).
// Regla: el dinero usa numeric con mode 'string' (nunca 'number'); el dominio lo convierte a Dinero.

/** Esquema de negocio de PostgreSQL (no public: ver la migración 0001). */
const conta = pgSchema('conta');

/** Raíz del aislamiento: la llave de empresa es su propio id. */
export const empresas = conta.table('empresas', {
  id: uuid('id').primaryKey(),
  razonSocial: text('razon_social').notNull(),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Quién pertenece a qué empresa, con qué rol y en qué modo (HU-04.02, HU-04.03). usuario_id, invitada_por y
 * retirada_por apuntan a conta_identidad.usuarios. Una sola membresía vigente (sin retirar) por persona y empresa.
 */
export const membresias = conta.table('membresias', {
  id: uuid('id').primaryKey(),
  empresaId: uuid('empresa_id').notNull(),
  usuarioId: uuid('usuario_id').notNull(),
  rol: text('rol').notNull(),
  modo: text('modo').notNull(),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  invitadaPor: uuid('invitada_por'),
  aceptadaEn: timestamp('aceptada_en', { withTimezone: true }),
  retiradaEn: timestamp('retirada_en', { withTimezone: true }),
  retiradaPor: uuid('retirada_por'),
});
