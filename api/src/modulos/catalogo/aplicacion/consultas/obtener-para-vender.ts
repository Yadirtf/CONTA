import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import type { Cliente } from '../../dominio/clientes/index.js';
import type { Producto } from '../../dominio/productos/index.js';
import type { RepositoriosDeCatalogo } from '../puertos/repositorios-de-catalogo.js';

/** Lo que se vende y a quién (HU-06.01): facturación toma de aquí el precio, el IVA y el comprador, nunca de la app. */
export interface ParaVender {
  readonly productos: Producto[];
  /** null si no se pidió comprador o si no es de esta empresa. */
  readonly comprador: Cliente | null;
}

/**
 * Lee, en una sola transacción de la empresa, los productos y el comprador de una venta. Pide Permiso.Vender. Lo
 * que no es de la empresa no aparece (RLS): facturación lo trata como no encontrado.
 */
export class ObtenerParaVender {
  constructor(private readonly catalogo: UnidadDeTrabajo<RepositoriosDeCatalogo>) {}

  ejecutar(contexto: ContextoDeMiembro, productoIds: readonly string[], compradorId: string | null): Promise<ParaVender> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    return this.catalogo.ejecutar(contexto, async ({ productos, clientes }) => ({
      productos: await productos.conIds(productoIds),
      comprador: compradorId === null ? null : await clientes.conId(compradorId),
    }));
  }
}
