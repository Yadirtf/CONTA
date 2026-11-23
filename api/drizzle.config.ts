import { defineConfig } from 'drizzle-kit';

// Esquema de Drizzle (solo infraestructura) y carpeta de migraciones SQL versionadas.
// Políticas RLS, FORCE ROW LEVEL SECURITY, triggers de inmutabilidad y GRANT van en migraciones
// SQL personalizadas: npm run migracion:nueva -- <nombre>.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/compartido/infraestructura/persistencia/esquema.ts',
  out: './migraciones',
  migrations: { table: 'migraciones', schema: 'conta_sistema' },
});
