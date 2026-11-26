import { Permiso } from './permiso.js';
import { tienePermiso } from './permisos-por-rol.js';
import type { Rol } from './rol.js';

/**
 * Cara con la que la persona ve la empresa (HU-04.03): simple, con palabras de la calle, o contador, con
 * términos técnicos. Va en la membresía y lo entrega la API; nunca es una bandera local de la app.
 * El modo no autoriza nada: los permisos salen solo del rol.
 */
export const MODOS = ['simple', 'contador'] as const;

export type Modo = (typeof MODOS)[number];

export function esModo(valor: unknown): valor is Modo {
  return typeof valor === 'string' && (MODOS as readonly string[]).includes(valor);
}

/** true si el rol puede trabajar en ese modo. El simple siempre se puede. */
export function modoPermitido(rol: Rol, modo: Modo): boolean {
  return modo === 'simple' || tienePermiso(rol, Permiso.UsarModoContador);
}

/** Modo con que empieza una membresía: el contador entra en modo contador; los demás, en simple. */
export function modoPorDefecto(rol: Rol): Modo {
  return rol === 'contador' ? 'contador' : 'simple';
}
