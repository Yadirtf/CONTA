import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { Membresia } from '../../dominio/membresia.js';

/** Membresías de la empresa de la transacción (RLS): no ve las de otras empresas. */
export interface RepositorioMembresias {
  /** Membresía invitada o activa de la persona, o null. No bloquea: sirve para leer. */
  vigenteDe(usuarioId: IdUsuario): Promise<Membresia | null>;
  /** Igual que vigenteDe, pero bloquea la fila hasta el fin de la transacción: para cambiarla. */
  tomarVigente(usuarioId: IdUsuario): Promise<Membresia | null>;
  /** Invitadas y activas, las más antiguas primero. */
  listarVigentes(): Promise<Membresia[]>;
  contarVigentes(): Promise<number>;
  /** Membresías creadas por invitación desde esa fecha, retiradas o no. */
  contarInvitacionesDesde(fecha: Date): Promise<number>;
  /** Dueños activos, con sus filas bloqueadas: dos cambios a la vez no pueden dejar la empresa sin dueño. */
  contarDuenosActivosBloqueando(): Promise<number>;
  /** Inserta una membresía nueva. Falla con miembro.ya-esta si la persona ya tiene una vigente. */
  agregar(membresia: Membresia): Promise<void>;
  /** Guarda rol, modo, aceptación y retiro de una membresía que ya existe. */
  guardar(membresia: Membresia): Promise<void>;
}
