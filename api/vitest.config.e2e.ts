import { defineConfig } from 'vitest/config';

// Pruebas e2e de la API completa. En CI corren contra la rama de Neon del PR (DATABASE_URL).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e-spec.ts', 'test/integracion/**/*.int-spec.ts'],
  },
});
