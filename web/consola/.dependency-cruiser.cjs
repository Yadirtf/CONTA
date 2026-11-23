// Reglas de dependencia de web/ (HU-01.03). Fuente: Docs/arquitectura/arquitectura-limpia.md, sección 4.3.
// Este archivo es igual en web/consola y web/sitio. Si una regla falla, el mensaje nombra la regla.
// Una excepción solo se admite con un ADR aprobado y se anota aquí junto al número del ADR.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'dominio-sin-frameworks',
      comment: 'El dominio de una funcionalidad es TypeScript puro: no importa react, next, SDKs ni módulos de Node.',
      severity: 'error',
      from: { path: '(^|/)dominio/', pathNot: '\\.test\\.tsx?$' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg', 'npm-unknown', 'core'],
      },
    },
    {
      name: 'dominio-sin-otras-capas',
      comment: 'El dominio no depende de datos/ ni de ui/ ni de las páginas de app/.',
      severity: 'error',
      from: { path: '(^|/)dominio/' },
      to: { path: ['(^|/)(datos|ui)/', '(^|/)src/app/'] },
    },
    {
      name: 'datos-sin-ui',
      comment: 'datos/ (cliente de la API) no importa componentes de ui/ ni páginas de app/.',
      severity: 'error',
      from: { path: '(^|/)datos/' },
      to: { path: ['(^|/)ui/', '(^|/)src/app/'] },
    },
    {
      name: 'funcionalidad-sin-datos-ni-ui-ajenos',
      comment:
        'Una funcionalidad no importa los datos/ ni la ui/ de otra; comparte por compartido/ o por la API. La lógica fiscal y contable vive en la API.',
      severity: 'error',
      from: { path: '(^|/)funcionalidades/([^/]+)/' },
      to: {
        path: '(^|/)funcionalidades/([^/]+)/(datos|ui)/',
        pathNot: '(^|/)funcionalidades/$2/',
      },
    },
    {
      name: 'compartido-sin-funcionalidades',
      comment: 'compartido/ no conoce las funcionalidades: las dependencias apuntan hacia compartido/, no al revés.',
      severity: 'error',
      from: { path: '(^|/)compartido/' },
      to: { path: '(^|/)funcionalidades/' },
    },
    {
      name: 'importacion-resuelta',
      comment: 'Todo import debe resolverse; uno que no se resuelve esconde una dependencia que las reglas no ven.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'sin-ciclos',
      comment: 'Sin dependencias circulares.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.css$' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.d.ts'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
