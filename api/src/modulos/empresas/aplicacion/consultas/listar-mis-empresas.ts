import type { UnidadDeTrabajoDelUsuario } from '../../../../compartido/aplicacion/index.js';
import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { Empresa } from '../../dominio/empresa.js';
import type { RepositoriosDelUsuario } from '../puertos/repositorio-de-mis-empresas.js';

/** Empresas a las que pertenece la persona, para que elija en cuál trabajar (HU-04.02). */
export class ListarMisEmpresas {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajoDelUsuario<RepositoriosDelUsuario>) {}

  ejecutar(usuarioId: IdUsuario): Promise<Empresa[]> {
    return this.unidadDeTrabajo.ejecutar({ usuarioId }, ({ misEmpresas }) => misEmpresas.listar());
  }
}
