import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { ErrorDominio, exigirPermiso, type IdUsuario, type Modo, Permiso, type Rol } from '../../../../compartido/dominio/index.js';
import type { Membresia } from '../../dominio/membresia.js';
import { exigirQueNoSeaElMismo, exigirQueQuedeUnDueno } from '../../dominio/reglas-de-gestion.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';
import { autorizarGestion } from './autorizar-gestion.js';

export interface CambioDeMembresia {
  readonly rol?: Rol;
  readonly modo?: Modo;
}

/**
 * El dueño cambia el rol o el modo de una persona de la empresa (HU-04.03). Nadie cambia su propio rol y la
 * empresa nunca queda sin dueño. El modo se aplica después del rol, para validarlo contra el rol nuevo.
 */
export class CambiarMembresia {
  constructor(private readonly empresas: UnidadDeTrabajo<RepositoriosDeEmpresas>) {}

  async ejecutar(contexto: ContextoDeMiembro, objetivo: IdUsuario, cambio: CambioDeMembresia): Promise<Membresia> {
    exigirPermiso(contexto.rol, Permiso.GestionarMiembros);
    return this.empresas.ejecutar(contexto, async ({ membresias }) => {
      const { duenosActivos } = await autorizarGestion(membresias, contexto.usuarioId, Permiso.GestionarMiembros);
      const membresia = await membresias.tomarVigente(objetivo);
      if (!membresia) throw new ErrorDominio('miembro.no-encontrado', 'Esa persona no está en la empresa');
      if (cambio.rol && cambio.rol !== membresia.rol) {
        exigirQueNoSeaElMismo(contexto.usuarioId, membresia);
        exigirQueQuedeUnDueno(membresia, cambio.rol, duenosActivos);
        membresia.cambiarRol(cambio.rol);
      }
      if (cambio.modo) membresia.cambiarModo(cambio.modo);
      await membresias.guardar(membresia);
      return membresia;
    });
  }
}
