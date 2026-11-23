// Reglas de dependencia de la API (HU-01.02). Fuente: Docs/arquitectura/arquitectura-limpia.md, sección 3.
// Si una regla falla, el mensaje nombra la regla. Una excepción solo se admite con un ADR aprobado y se anota
// aquí junto al número del ADR.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'dominio-sin-frameworks',
      comment:
        'El dominio no importa paquetes externos: ni @nestjs/*, hono, @cloudflare/*, @neondatabase/*, ORM (drizzle, prisma, typeorm, kysely), pg, axios ni SDKs. Solo TypeScript puro.',
      severity: 'error',
      from: { path: '(^|/)dominio/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'dominio-sin-node',
      comment: 'El dominio no usa módulos de Node (fs, http, crypto...): todo lo externo entra por un puerto.',
      severity: 'error',
      from: { path: '(^|/)dominio/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'dominio-sin-otras-capas',
      comment: 'El dominio no depende de aplicacion/, infraestructura/ ni presentacion/.',
      severity: 'error',
      from: { path: '(^|/)dominio/' },
      to: { path: '(^|/)(aplicacion|infraestructura|presentacion)/' },
    },
    {
      name: 'aplicacion-sin-frameworks',
      comment: 'La aplicación no importa frameworks ni SDKs: los recibe por puertos declarados en ella o en el dominio.',
      severity: 'error',
      from: { path: '(^|/)aplicacion/' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'aplicacion-sin-infraestructura-ni-presentacion',
      comment: 'La aplicación no importa de infraestructura/ ni de presentacion/.',
      severity: 'error',
      from: { path: '(^|/)aplicacion/' },
      to: { path: '(^|/)(infraestructura|presentacion)/' },
    },
    {
      name: 'presentacion-sin-infraestructura',
      comment: 'La presentación recibe la infraestructura por inyección; solo el *.module.ts la conoce.',
      severity: 'error',
      from: { path: '(^|/)presentacion/' },
      to: { path: '(^|/)infraestructura/' },
    },
    {
      name: 'infraestructura-sin-presentacion',
      comment: 'La infraestructura no depende de la presentación.',
      severity: 'error',
      from: { path: '(^|/)infraestructura/' },
      to: { path: '(^|/)presentacion/' },
    },
    {
      name: 'modulos-solo-por-su-index',
      comment:
        'Un módulo usa otro solo por su API pública (modulos/<otro>/index.ts) o por eventos de dominio; nunca su dominio, aplicación o infraestructura internos.',
      severity: 'error',
      from: { path: '(^|/)modulos/([^/]+)/' },
      to: {
        path: '(^|/)modulos/([^/]+)/',
        pathNot: ['(^|/)modulos/$2/', '(^|/)modulos/[^/]+/index\\.ts$'],
      },
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
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.mjs', '.cjs', '.d.ts'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
