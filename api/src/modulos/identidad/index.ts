// API pública del módulo de identidad (HU-04.01). Otros módulos solo importan desde aquí.
export { IdentidadModule } from './identidad.module.js';
export { GuardaDeSesion, SesionDeLaPeticion } from './presentacion/http/guarda-de-sesion.js';
export { tokenDeLaPeticion } from './presentacion/http/token-de-la-peticion.js';
export { SesionDelToken } from './aplicacion/consultas/sesion-del-token.js';
export { RegistrarPersona } from './aplicacion/comandos/registrar-persona.js';
export { CelularesDePersonas } from './aplicacion/consultas/celulares-de-personas.js';
export type { SesionVigente } from './aplicacion/puertos/repositorios-de-identidad.js';
export { ENVIADOR_DE_CODIGOS, type EnviadorDeCodigos } from './aplicacion/puertos/enviador-de-codigos.js';
export { Celular, IdUsuario, POLITICA_DE_ACCESO, type Usuario } from './dominio/index.js';
