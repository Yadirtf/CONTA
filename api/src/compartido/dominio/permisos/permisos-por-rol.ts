import { Permiso } from './permiso.js';
import type { Rol } from './rol.js';

/**
 * Única fuente de verdad de lo que puede cada rol (HU-04.03, ADR-0012). Lo que no está aquí, está negado.
 * - Dueño: todo.
 * - Contador: lo contable y fiscal (también el precio e IVA de los productos), pero no decide quién trabaja en
 *   la empresa.
 * - Cajero: vende y nada más; no crea productos, no ve informes ni anula documentos.
 */
const MATRIZ: Readonly<Record<Rol, ReadonlySet<Permiso>>> = {
  dueno: new Set(Object.values(Permiso)),
  contador: new Set([
    Permiso.VerEmpresa,
    Permiso.Vender,
    Permiso.GestionarProductos,
    Permiso.VerInformes,
    Permiso.AnularDocumentos,
    Permiso.UsarModoContador,
  ]),
  cajero: new Set([Permiso.VerEmpresa, Permiso.Vender]),
};

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return MATRIZ[rol].has(permiso);
}

/** Permisos del rol, en el orden en que se declaran en Permiso. La app los usa para mostrar u ocultar acciones. */
export function permisosDe(rol: Rol): Permiso[] {
  return Object.values(Permiso).filter((permiso) => MATRIZ[rol].has(permiso));
}
