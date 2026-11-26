import type { Empresa } from '../../dominio/empresa.js';

/**
 * Empresas de la persona de una transacción del usuario (ADR-0011). Solo lee: PostgreSQL no deja escribir en
 * ella, y solo muestra las empresas donde la persona tiene membresía. No filtra a mano por usuario.
 */
export interface RepositorioDeMisEmpresas {
  /** Ordenadas por razón social. */
  listar(): Promise<Empresa[]>;
  contar(): Promise<number>;
}

export interface RepositoriosDelUsuario {
  readonly misEmpresas: RepositorioDeMisEmpresas;
}
