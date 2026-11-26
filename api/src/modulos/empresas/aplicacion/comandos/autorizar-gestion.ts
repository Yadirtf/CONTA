import { ErrorDominio, exigirPermiso, type IdUsuario, type Permiso } from '../../../../compartido/dominio/index.js';
import type { Membresia } from '../../dominio/membresia.js';
import type { RepositorioMembresias } from '../puertos/repositorio-membresias.js';

export interface GestionAutorizada {
  /** Membresía de quien actúa, leída en esta transacción. */
  readonly actor: Membresia;
  /** Dueños activos de la empresa; sus filas quedan bloqueadas hasta el fin de la transacción. */
  readonly duenosActivos: number;
}

/**
 * Abre un cambio a las membresías de la empresa (ADR-0012):
 * 1. bloquea las filas de los dueños activos, así que los cambios de una misma empresa van uno tras otro y
 *    siempre toman los bloqueos en el mismo orden (no se cruzan);
 * 2. después vuelve a leer la membresía de quien actúa y exige el permiso. Al leer tras el bloqueo, un rol
 *    cambiado o un retiro que otra transacción acaba de confirmar ya cuenta.
 */
export async function autorizarGestion(membresias: RepositorioMembresias, actor: IdUsuario, permiso: Permiso): Promise<GestionAutorizada> {
  const duenosActivos = await membresias.contarDuenosActivosBloqueando();
  const membresia = await membresias.vigenteDe(actor);
  if (membresia?.estado !== 'activa') throw new ErrorDominio('empresa.no-encontrada', 'No encontramos esa empresa');
  exigirPermiso(membresia.rol, permiso);
  return { actor: membresia, duenosActivos };
}
