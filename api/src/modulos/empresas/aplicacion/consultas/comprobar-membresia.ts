import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { IdEmpresa, IdUsuario } from '../../../../compartido/dominio/index.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';

/**
 * Da el contexto de una empresa solo a quien pertenece a ella (HU-04.02, ADR-0011). Pregunta dentro de una
 * transacción de esa empresa, así que RLS filtra la membresía: una empresa ajena o inexistente da null igual.
 * Se consulta en cada petición: retirar una membresía surte efecto en la siguiente.
 */
export class ComprobarMembresia {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeEmpresas>) {}

  async ejecutar(usuarioId: IdUsuario, empresaId: IdEmpresa): Promise<ContextoEmpresa | null> {
    const contexto: ContextoEmpresa = { empresaId };
    const esMiembro = await this.unidadDeTrabajo.ejecutar(contexto, ({ membresias }) => membresias.esMiembro(usuarioId));
    return esMiembro ? contexto : null;
  }
}
