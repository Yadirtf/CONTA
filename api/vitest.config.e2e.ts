import { defineConfig } from 'vitest/config';

// Pruebas e2e de la API completa. En CI corren contra la rama de Neon del PR (DATABASE_URL).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e-spec.ts', 'test/integracion/**/*.int-spec.ts'],
    // Un archivo a la vez: comparten la misma base de Neon (plan gratis) y en paralelo se roban latencia.
    // La prueba de 200 transacciones de HU-01.05 pasaba de 60 s cuando corría junto con la de envío a la DIAN.
    fileParallelism: false,
  },
});
