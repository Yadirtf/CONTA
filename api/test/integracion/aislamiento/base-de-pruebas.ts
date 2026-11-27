import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { urlBaseDeDatos } from '../../../src/compartido/infraestructura/config/base-de-datos.js';

// Base de las pruebas de aislamiento (HU-01.05). Corren contra PostgreSQL real conectadas como el rol
// de la API (conta_api): en CI, la rama de Neon del PR; en local, la base de DATABASE_URL.
// Sin DATABASE_URL se saltan, salvo con REQUIERE_BASE=true (CI con Neon), que las vuelve obligatorias.
export const url = urlBaseDeDatos();
export const requiereBase = process.env['REQUIERE_BASE'] === 'true';
export const hayBase = url !== undefined;

/**
 * Conexión del dueño de las tablas (conta_app). Sirve para sembrar lo que conta_api solo puede leer (datos fiscales y
 * resoluciones, HU-06.01). En CI es la cadena que entrega Neon; en local, la del entorno de ataque.
 */
export const urlDueno = process.env['DATABASE_URL_DUENO'];
export const hayDueno = urlDueno !== undefined && urlDueno !== '';

/** Tablas que se limpian, en orden, al borrar lo que sembró el dueño para una empresa de prueba. */
const SEMBRADAS = [
  'conta.intentos_correo_de_factura',
  'conta.correos_de_factura',
  'conta.respuestas_de_aceptacion',
  'conta_sistema.cola_emision_ventas',
  'conta.emisiones_de_venta',
  'conta.lineas_de_venta',
  'conta.ventas',
  'conta_sistema.cola_envios_dian',
  'conta.intentos_envio_dian',
  'conta.envios_dian',
  'conta.resoluciones_de_numeracion',
  'conta.datos_fiscales',
  'conta.productos',
  'conta.clientes',
  'conta.membresias',
] as const;

/** Abre una conexión del dueño. */
export async function conexionDelDueno(): Promise<pg.Client> {
  const dueno = new pg.Client({ connectionString: urlDueno });
  await dueno.connect();
  return dueno;
}

/** Borra todo lo de una empresa de prueba sembrada por el dueño (y la empresa). Solo para pruebas. */
export async function borrarEmpresaDePrueba(dueno: pg.Client, empresaId: string): Promise<void> {
  for (const tabla of SEMBRADAS) await dueno.query(`DELETE FROM ${tabla} WHERE empresa_id = $1`, [empresaId]);
  await dueno.query('DELETE FROM conta.empresas WHERE id = $1', [empresaId]);
}

/**
 * Siembra con el dueño (transacción confirmada), corre `prueba` y borra lo sembrado aunque la prueba falle.
 */
export async function conFilaDelDueno<T>(
  sembrar: (dueno: pg.Client) => Promise<string>,
  empresaId: string,
  prueba: (id: string) => Promise<T>,
): Promise<T> {
  const dueno = await conexionDelDueno();
  try {
    await dueno.query('BEGIN');
    const id = await sembrar(dueno);
    await dueno.query('COMMIT');
    return await prueba(id);
  } finally {
    await dueno.query('ROLLBACK').catch(() => undefined);
    await borrarEmpresaDePrueba(dueno, empresaId);
    await dueno.end();
  }
}

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
