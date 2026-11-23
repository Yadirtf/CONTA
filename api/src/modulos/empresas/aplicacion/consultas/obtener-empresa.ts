import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { IdEmpresa } from '../../../../compartido/dominio/index.js';
import type { Empresa } from '../../dominio/empresa.js';
import type { RepositoriosDeEmpresas } from '../puertos/repositorio-empresas.js';

/** Devuelve la empresa pedida si es visible para la empresa del contexto; si no, null (la API responde 404). */
export class ObtenerEmpresa {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeEmpresas>) {}

  ejecutar(contexto: ContextoEmpresa, id: IdEmpresa): Promise<Empresa | null> {
    return this.unidadDeTrabajo.ejecutar(contexto, ({ empresas }) => empresas.buscar(id));
  }
}
