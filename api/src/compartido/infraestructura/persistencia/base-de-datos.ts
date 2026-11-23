import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { urlBaseDeDatos, type VariablesDeEntorno } from '../config/base-de-datos.js';
import * as esquema from './esquema.js';

export type Esquema = typeof esquema;
export type BaseDeDatosDrizzle = NodePgDatabase<Esquema>;
/** Ejecutor atado a una transacción con la empresa ya fijada. Es lo único que reciben los repositorios. */
export type Ejecutor = Parameters<Parameters<BaseDeDatosDrizzle['transaction']>[0]>[0];

/**
 * Pool de conexiones a PostgreSQL (Neon con pooler en modo transacción). Solo lo usa la unidad de trabajo:
 * ningún otro archivo importa `pg` (regla pool-solo-en-persistencia de dependency-cruiser).
 * Sin DATABASE_URL la API arranca igual (GET /salud no usa la base) y falla solo al pedir una transacción.
 */
export class BaseDeDatos {
  private readonly pool: pg.Pool | undefined;
  private readonly db: BaseDeDatosDrizzle | undefined;

  constructor(env: VariablesDeEntorno = process.env, maximoDeConexiones = 10) {
    const url = urlBaseDeDatos(env);
    if (!url) return;
    this.pool = new pg.Pool({ connectionString: url, max: maximoDeConexiones, idleTimeoutMillis: 10_000 });
    // Un error de una conexión ociosa (Neon la cierra al dormir) no debe tumbar el proceso.
    this.pool.on('error', (error) => console.error(`Conexión a PostgreSQL perdida: ${error.message}`));
    this.db = drizzle(this.pool, { schema: esquema });
  }

  drizzle(): BaseDeDatosDrizzle {
    if (!this.db) throw new Error('No hay base de datos configurada (falta DATABASE_URL)');
    return this.db;
  }

  async cerrar(): Promise<void> {
    await this.pool?.end();
  }
}
