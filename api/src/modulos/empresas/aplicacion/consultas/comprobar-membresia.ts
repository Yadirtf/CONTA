import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { IdEmpresa, IdUsuario } from '../../../../compartido/dominio/index.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';

/**
 * Da el contexto de una empresa, con el rol, solo a quien tiene en ella una membresía activa (HU-04.02 y
 * HU-04.03, ADR-0011 y ADR-0012). Pregunta dentro de una transacción de esa empresa, así que RLS filtra la
 * membresía: una empresa ajena, inexistente, una invitación sin aceptar o un retiro dan null igual.
 * Se consulta en cada petición: retirar una membresía o cambiar el rol surte efecto en la siguiente.
 */
export class ComprobarMembresia {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeEmpresas>) {}

  async ejecutar(usuarioId: IdUsuario, empresaId: IdEmpresa): Promise<ContextoDeMiembro | null> {
    const membresia = await this.unidadDeTrabajo.ejecutar({ empresaId }, ({ membresias }) => membresias.vigenteDe(usuarioId));
    return membresia?.estado === 'activa' ? { empresaId, usuarioId, rol: membresia.rol } : null;
  }
}
