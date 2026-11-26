import type { IdUsuario } from '../../dominio/index.js';
import type { UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';

/** Celular enmascarado (+57 300 *** 4567) de cada persona, por el valor de su id. El completo nunca sale. */
export class CelularesDePersonas {
  constructor(private readonly uow: UnidadDeTrabajoDeIdentidad) {}

  async ejecutar(ids: readonly IdUsuario[]): Promise<ReadonlyMap<string, string>> {
    if (ids.length === 0) return new Map();
    const usuarios = await this.uow.ejecutar(({ usuarios }) => usuarios.buscarPorIds(ids));
    return new Map(usuarios.map((u) => [u.id.valor, u.celular.enmascarado()]));
  }
}
