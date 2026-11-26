import type { Modo, Rol } from '../../../../compartido/dominio/index.js';
import type { Empresa } from '../../dominio/empresa.js';
import type { EstadoDeMembresia } from '../../dominio/membresia.js';

/** Una empresa de la persona con lo que su membresía le da en ella (HU-04.03). */
export interface MiEmpresa {
  readonly empresa: Empresa;
  readonly rol: Rol;
  readonly modo: Modo;
  readonly estado: Exclude<EstadoDeMembresia, 'retirada'>;
}

/**
 * Empresas de la persona de una transacción del usuario (ADR-0011). Solo lee: PostgreSQL no deja escribir en
 * ella, y solo muestra las empresas donde la persona tiene una membresía vigente. No filtra a mano por usuario.
 */
export interface RepositorioDeMisEmpresas {
  /** Ordenadas por razón social. Incluye las invitaciones pendientes. */
  listar(): Promise<MiEmpresa[]>;
  /** Membresías vigentes (invitadas o activas). */
  contar(): Promise<number>;
}

export interface RepositoriosDelUsuario {
  readonly misEmpresas: RepositorioDeMisEmpresas;
}
