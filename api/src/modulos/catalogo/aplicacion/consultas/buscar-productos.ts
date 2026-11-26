import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import { BusquedaDeProductos, MAXIMO_DE_PRODUCTOS_POR_PAGINA, type Producto } from '../../dominio/productos/index.js';
import type { RepositoriosDeCatalogo } from '../puertos/repositorios-de-catalogo.js';

/** Productos para vender (HU-05.02): por parte del nombre o el comienzo del código; vacío, los primeros 50. */
export class BuscarProductos {
  constructor(private readonly catalogo: UnidadDeTrabajo<RepositoriosDeCatalogo>) {}

  async ejecutar(contexto: ContextoDeMiembro, texto: string): Promise<Producto[]> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    const busqueda = BusquedaDeProductos.de(texto);
    return this.catalogo.ejecutar(contexto, ({ productos }) => productos.buscar(busqueda, MAXIMO_DE_PRODUCTOS_POR_PAGINA));
  }
}
