// Esquema de Drizzle. Las tablas de negocio llegan desde HU-01.05 en adelante, cada una con empresa_id y RLS.
// Regla: el dinero usa numeric con mode 'string' (nunca 'number'); el dominio lo convierte a Dinero.
export {};
