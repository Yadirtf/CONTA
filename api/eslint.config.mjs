// Lint de la API (HU-01.03). Reglas con tipos de typescript-eslint sobre src/, test/ y scripts/.
// Las reglas de capas no viven aquí: las revisa dependency-cruiser (npm run dependencias, HU-01.02).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Aislamiento multiempresa (HU-01.05, ADR-0006): en src/ nadie arma SQL con texto ni toca la empresa de la conexión.
// Solo las unidades de trabajo fijan la empresa o el usuario, con conta_sistema.fijar_empresa() o fijar_usuario().
const SQL_SEGURO = [
  {
    selector: "MemberExpression[object.name='sql'][property.name='raw']",
    message: 'sql.raw arma SQL con texto y abre la puerta a inyección: usa parámetros de la plantilla sql`...`.',
  },
  {
    selector: 'Literal[value=/set_config|app\\.(empresa|usuario)_id/i], TemplateElement[value.raw=/set_config|app\\.(empresa|usuario)_id/i]',
    message: 'La empresa o el usuario de la conexión solo los fijan las unidades de trabajo con conta_sistema.fijar_empresa() o fijar_usuario().',
  },
];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'migraciones/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.node,
    },
    rules: {
      // Una promesa olvidada esconde fallas de la DIAN, Wompi o la base de datos.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/dominio/**'],
    rules: { 'no-restricted-syntax': ['error', ...SQL_SEGURO] },
  },
  {
    // Dinero exacto (HU-01.04, ADR-0005): en el dominio no hay decimales de punto flotante.
    // Los montos, tarifas y cantidades se escriben como texto ('0.19') y se operan con Dinero o DecimalExacto.
    files: ['src/**/dominio/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...SQL_SEGURO,
        {
          selector: 'Literal[raw=/^[0-9_]*\\.[0-9]/]',
          message: 'Sin decimales en number dentro del dominio: usa Dinero.de(\'0.19\') o DecimalExacto.desde(\'0.19\').',
        },
        {
          selector: "CallExpression[callee.name='parseFloat'], MemberExpression[object.name='Number'][property.name='parseFloat']",
          message: 'parseFloat devuelve un número de punto flotante: usa DecimalExacto.desde(texto).',
        },
        {
          selector: "MemberExpression[property.name='toFixed']",
          message: 'toFixed redondea un número de punto flotante: usa Dinero.redondear() o DecimalExacto.redondear().',
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name=/^(round|floor|ceil|trunc)$/]",
          message: 'Redondear en el dominio se hace con DecimalExacto.redondear(escala, modo) (mitad al par por defecto).',
        },
      ],
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // Las pruebas usan los globales de Vitest y objetos parciales de NestJS.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: { globals: globals.vitest },
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
