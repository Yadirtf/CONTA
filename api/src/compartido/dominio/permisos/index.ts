export { CODIGO_SIN_PERMISO, exigirPermiso } from './exigir-permiso.js';
export { exigeSegundoFactor } from './exige-segundo-factor.js';
export { esModo, type Modo, MODOS, modoPermitido, modoPorDefecto } from './modo.js';
export { Permiso } from './permiso.js';
export { permisosDe, tienePermiso } from './permisos-por-rol.js';
export { esRol, type Rol, ROLES } from './rol.js';
export {
  CODIGO_SIN_SEGUNDO_FACTOR,
  CODIGO_SIN_SEGUNDO_FACTOR_RECIENTE,
  exigirSegundoFactor,
  NIVELES_DE_SEGUNDO_FACTOR,
  type SegundoFactorDeLaSesion,
} from './segundo-factor-de-la-sesion.js';
