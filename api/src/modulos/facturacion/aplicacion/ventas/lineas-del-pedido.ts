import { lineaDeVenta, type LineaDeVenta, type Participante, type PedidoDeVenta } from '../../dominio/index.js';
import type { LoQueSeVende } from '../puertos/catalogo-de-venta.js';
import { compradorNoEncontrado, productoNoEncontrado } from './errores-de-venta.js';

/**
 * Une el pedido con lo que dice el catálogo: cada línea con el precio y el IVA guardados, en el orden del pedido.
 * Si falta un producto o el comprador, la venta no sigue (nunca se vende algo que no es de la empresa).
 */
export function lineasDelPedido(pedido: PedidoDeVenta, catalogo: LoQueSeVende): { lineas: LineaDeVenta[]; comprador: Participante } {
  const { comprador } = catalogo;
  if (comprador === null) throw compradorNoEncontrado();
  const porId = new Map(catalogo.articulos.map((a) => [a.productoId, a]));
  const lineas = pedido.lineas.map(({ productoId, cantidad }) => {
    const articulo = porId.get(productoId);
    if (!articulo) throw productoNoEncontrado();
    return lineaDeVenta(articulo, cantidad);
  });
  return { lineas, comprador };
}
