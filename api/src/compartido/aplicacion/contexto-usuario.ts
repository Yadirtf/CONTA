import type { IdUsuario } from '../dominio/index.js';

/**
 * Persona en cuyo nombre corre una consulta que cruza sus empresas, como listar «mis empresas» (HU-04.02,
 * ADR-0011). Igual que ContextoEmpresa, viaja explícito como parámetro.
 */
export interface ContextoUsuario {
  readonly usuarioId: IdUsuario;
}
