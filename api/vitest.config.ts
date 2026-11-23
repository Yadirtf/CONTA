import { defineConfig } from 'vitest/config';

// Pruebas unitarias: dominio y casos de uso, sin red ni base de datos.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/unitarias/**/*.spec.ts', 'test/arquitectura/**/*.spec.ts'],
  },
});
