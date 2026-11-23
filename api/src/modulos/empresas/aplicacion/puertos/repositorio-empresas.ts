import type { IdEmpresa } from '../../../../compartido/dominio/index.js';
import type { Empresa } from '../../dominio/empresa.js';

/** Repositorio atado a la transacción de una empresa: solo ve esa empresa (RLS). */
export interface RepositorioEmpresas {
  /** null si no existe o si es de otra empresa: para quien pregunta, las dos cosas son lo mismo. */
  buscar(id: IdEmpresa): Promise<Empresa | null>;
  guardar(empresa: Empresa): Promise<void>;
}

export interface RepositoriosDeEmpresas {
  readonly empresas: RepositorioEmpresas;
}
