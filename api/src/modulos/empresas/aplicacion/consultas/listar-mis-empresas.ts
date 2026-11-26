import type { UnidadDeTrabajoDelUsuario } from '../../../../compartido/aplicacion/index.js';
import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { MiEmpresa, RepositoriosDelUsuario } from '../puertos/repositorio-de-mis-empresas.js';

/** Empresas de la persona, con su rol, su modo y si la invitación está pendiente, para que elija (HU-04.02, HU-04.03). */
export class ListarMisEmpresas {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajoDelUsuario<RepositoriosDelUsuario>) {}

  ejecutar(usuarioId: IdUsuario): Promise<MiEmpresa[]> {
    return this.unidadDeTrabajo.ejecutar({ usuarioId }, ({ misEmpresas }) => misEmpresas.listar());
  }
}
