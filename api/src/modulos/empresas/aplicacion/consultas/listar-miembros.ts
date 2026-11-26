import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import type { MiembroConCelular } from '../comandos/invitar-miembro.js';
import type { DirectorioDePersonas } from '../puertos/directorio-de-personas.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';

/** Personas de la empresa, invitadas y activas, con su celular enmascarado (HU-04.03). Solo para quien las gestiona. */
export class ListarMiembros {
  constructor(
    private readonly empresas: UnidadDeTrabajo<RepositoriosDeEmpresas>,
    private readonly directorio: DirectorioDePersonas,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro): Promise<MiembroConCelular[]> {
    exigirPermiso(contexto.rol, Permiso.GestionarMiembros);
    const vigentes = await this.empresas.ejecutar(contexto, ({ membresias }) => membresias.listarVigentes());
    const celulares = await this.directorio.celularesDe(vigentes.map((m) => m.usuarioId));
    return vigentes.map((membresia) => ({ membresia, celular: celulares.get(membresia.usuarioId.valor) ?? '' }));
  }
}
