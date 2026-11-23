// Lint de la consola (HU-01.03): reglas de Next.js (Core Web Vitals) y de TypeScript.
// Las reglas de capas no viven aquí: las revisa dependency-cruiser (npm run dependencias).
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', '.open-next/**', '.wrangler/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', 'cloudflare-env.d.ts']),
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
]);
