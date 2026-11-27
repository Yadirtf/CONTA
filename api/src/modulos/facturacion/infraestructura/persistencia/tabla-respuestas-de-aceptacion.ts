import { pgSchema, text, uuid } from 'drizzle-orm/pg-core';

// conta.respuestas_de_aceptacion (migración 0010): el ApplicationResponse de la DIAN al aceptar, solo inserción.
export const respuestasDeAceptacion = pgSchema('conta').table('respuestas_de_aceptacion', {
  empresaId: uuid('empresa_id').notNull(),
  envioId: uuid('envio_id').notNull(),
  xmlBase64: text('xml_base64').notNull(),
});
