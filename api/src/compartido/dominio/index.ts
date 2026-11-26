// API pública del dominio compartido. Los módulos importan desde aquí, no desde los archivos internos.
export * from './dinero/index.js';
export { ErrorDominio } from './error-dominio.js';
export { IdEmpresa } from './id-empresa.js';
export { IdUsuario } from './id-usuario.js';
export * from './identificacion/index.js';
export { Nit } from './nit.js';
export * from './permisos/index.js';
export { textoLimpio } from './texto-limpio.js';
