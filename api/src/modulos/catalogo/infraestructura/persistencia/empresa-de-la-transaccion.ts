import { sql } from 'drizzle-orm';

/** La empresa de la transacción, fijada por la unidad de trabajo. Así el código nunca escribe una empresa a mano. */
export const empresaDeLaTransaccion = sql`conta_sistema.empresa_actual()`;
