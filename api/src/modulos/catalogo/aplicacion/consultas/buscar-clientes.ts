import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, type Nit, Permiso } from '../../../../compartido/dominio/index.js';
import { type Cliente, MAXIMO_DE_RESULTADOS, TerminoDeBusqueda } from '../../dominio/clientes/index.js';
import type { RepositoriosDeCatalogo } from '../puertos/repositorio-clientes.js';

export interface ResultadoDeBusqueda {
  /** Si lo escrito es un NIT posible, con su dígito de verificación calculado: la app lo muestra al escribir. */
  readonly nit: Nit | null;
  readonly clientes: readonly Cliente[];
}

/** Busca al comprador por el comienzo de su documento (HU-05.01). Pocos resultados: no sirve para listar a todos. */
export class BuscarClientes {
  constructor(private readonly catalogo: UnidadDeTrabajo<RepositoriosDeCatalogo>) {}

  async ejecutar(contexto: ContextoDeMiembro, texto: string): Promise<ResultadoDeBusqueda> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    const termino = TerminoDeBusqueda.de(texto);
    const clientes = await this.catalogo.ejecutar(contexto, ({ clientes }) =>
      clientes.buscarPorPrefijo(termino.prefijo, MAXIMO_DE_RESULTADOS),
    );
    return { nit: termino.nit, clientes };
  }
}
