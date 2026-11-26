import { ErrorDominio } from '../error-dominio.js';
import type { Permiso } from './permiso.js';
import { tienePermiso } from './permisos-por-rol.js';
import type { Rol } from './rol.js';

export const CODIGO_SIN_PERMISO = 'permiso.denegado';

/** Falla con «No tienes permiso» si el rol no tiene el permiso. Los casos de uso sensibles la llaman primero. */
export function exigirPermiso(rol: Rol, permiso: Permiso): void {
  if (!tienePermiso(rol, permiso)) throw new ErrorDominio(CODIGO_SIN_PERMISO, 'No tienes permiso');
}
