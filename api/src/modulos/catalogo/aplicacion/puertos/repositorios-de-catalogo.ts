import type { RepositorioClientes } from './repositorio-clientes.js';
import type { RepositorioProductos } from './repositorio-productos.js';

/** Lo que una transacción del catálogo puede tocar: compradores (HU-05.01) y productos (HU-05.02). */
export interface RepositoriosDeCatalogo {
  readonly clientes: RepositorioClientes;
  readonly productos: RepositorioProductos;
}
