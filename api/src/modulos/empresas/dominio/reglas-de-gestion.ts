import { ErrorDominio, type IdUsuario, type Rol } from '../../../compartido/dominio/index.js';
import type { Membresia } from './membresia.js';

/** Nadie cambia su propio rol: así nadie se sube de rol ni deja la empresa sin dueño por error. */
export function exigirQueNoSeaElMismo(actor: IdUsuario, objetivo: Membresia): void {
  if (objetivo.esDe(actor)) throw new ErrorDominio('miembro.sobre-si-mismo', 'No puedes cambiar tu propio rol');
}

/**
 * Toda empresa conserva al menos un dueño activo: sin él, nadie podría gestionar a sus miembros.
 * `duenosActivos` debe contarse con las filas bloqueadas, para que dos cambios a la vez no dejen cero.
 * `rolNuevo` null significa que la membresía se retira.
 */
export function exigirQueQuedeUnDueno(objetivo: Membresia, rolNuevo: Rol | null, duenosActivos: number): void {
  const dejaDeSerDueno = objetivo.estado === 'activa' && objetivo.rol === 'dueno' && rolNuevo !== 'dueno';
  if (dejaDeSerDueno && duenosActivos <= 1) {
    throw new ErrorDominio('miembro.ultimo-dueno', 'La empresa necesita al menos un dueño: nombra otro antes');
  }
}

/** Una persona tiene a lo sumo una membresía vigente por empresa. */
export function exigirQueNoTengaMembresia(vigente: Membresia | null): void {
  if (vigente) throw new ErrorDominio('miembro.ya-esta', 'Esa persona ya está en la empresa o tiene una invitación');
}
