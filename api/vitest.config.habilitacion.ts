import { defineConfig } from 'vitest/config';

// Prueba real contra la DIAN de habilitación (HU-02.03). Solo desde el workflow «Habilitación DIAN».
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/habilitacion/**/*.hab-spec.ts'],
  },
});
