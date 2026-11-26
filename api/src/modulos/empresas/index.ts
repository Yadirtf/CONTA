// API pública del módulo para otros módulos.
export { Empresa } from './dominio/empresa.js';
export { MAXIMO_DE_EMPRESAS_POR_PERSONA } from './dominio/limite-de-empresas.js';
export { MAXIMO_DE_INVITACIONES_POR_DIA, MAXIMO_DE_MIEMBROS_POR_EMPRESA } from './dominio/limites-de-miembros.js';
export { EmpresasModule, UNIDAD_DE_TRABAJO_EMPRESAS } from './empresas.module.js';
export type { RepositoriosDeEmpresas } from './aplicacion/puertos/repositorio-empresas.js';
