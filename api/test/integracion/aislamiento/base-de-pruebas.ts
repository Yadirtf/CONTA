import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { urlBaseDeDatos } from '../../../src/compartido/infraestructura/config/base-de-datos.js';

// Base de las pruebas de aislamiento (HU-01.05). Corren contra PostgreSQL real conectadas como el rol
// de la API (conta_api): en CI, la rama de Neon del PR; en local, la base de DATABASE_URL.
// Sin DATABASE_URL se saltan, salvo con REQUIERE_BASE=true (CI con Neon), que las vuelve obligatorias.
export const url = urlBaseDeDatos();
export const requiereBase = process.env['REQUIERE_BASE'] === 'true';
export const hayBase = url !== undefined;

export function nuevoId(): string {
  return randomUUID();
}

/** Corre `trabajo` en una transacción que siempre se deshace: las pruebas no dejan datos. */
export async function enTransaccionDeshecha<T>(trabajo: (cliente: pg.Client) => Promise<T>): Promise<T> {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    return await trabajo(cliente);
  } finally {
    await cliente.query('ROLLBACK').catch(() => undefined);
    await cliente.end();
  }
}

/**
 * Cambia la empresa de la transacción de prueba. Solo las pruebas lo hacen así, para simular a otra empresa
 * dentro de la misma transacción; el código de src/ usa conta_sistema.fijar_empresa(), que no lo permite.
 */
export async function comoEmpresa(cliente: pg.Client, empresaId: string | null): Promise<void> {
  await cliente.query(`SELECT set_config('app.empresa_id', $1, true)`, [empresaId ?? '']);
}

/** Ejecuta una consulta dentro de un SAVEPOINT y devuelve el error de PostgreSQL, si hubo. */
export async function errorDe(cliente: pg.Client, consulta: string, valores: unknown[]): Promise<Error | null> {
  await cliente.query('SAVEPOINT intento');
  try {
    await cliente.query(consulta, valores);
    await cliente.query('RELEASE SAVEPOINT intento');
    return null;
  } catch (error) {
    await cliente.query('ROLLBACK TO SAVEPOINT intento');
    return error as Error;
  }
}
