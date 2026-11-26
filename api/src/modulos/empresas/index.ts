// API pública del módulo para otros módulos.
export { Empresa } from './dominio/empresa.js';
export { MAXIMO_DE_EMPRESAS_POR_PERSONA } from './dominio/limite-de-empresas.js';
export { EmpresasModule, UNIDAD_DE_TRABAJO_EMPRESAS } from './empresas.module.js';
export type { RepositoriosDeEmpresas } from './aplicacion/puertos/repositorio-empresas.js';
