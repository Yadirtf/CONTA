import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { Membresia } from '../../dominio/membresia.js';

/** Membresías de la empresa de la transacción (RLS): no ve las de otras empresas. */
export interface RepositorioMembresias {
  /** true si la persona pertenece a la empresa de la transacción. */
  esMiembro(usuarioId: IdUsuario): Promise<boolean>;
  agregar(membresia: Membresia): Promise<void>;
}
