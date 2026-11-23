// Aplica las migraciones SQL de ./migraciones sobre la base indicada en DATABASE_URL.
// Lo usa GitHub Actions antes del deploy hook de Render (Docs/despliegue/entorno-de-pruebas.md).
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL: no hay base de datos sobre la cual migrar.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), {
    migrationsFolder: new URL('../migraciones', import.meta.url).pathname,
    migrationsTable: 'migraciones',
    migrationsSchema: 'conta_sistema',
  });
  console.log('Migraciones aplicadas.');
} catch (error) {
  // Solo el mensaje: la cadena de conexión nunca se imprime.
  console.error(`Fallaron las migraciones: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
