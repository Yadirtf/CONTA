import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import { MAXIMO_DE_LINEAS } from './limites-de-ventas.js';
import { medioDePago, type MedioDePago } from './medio-de-pago.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Lo que pide la app: qué productos y cuántos, a nombre de quién y cómo pagó. Nunca trae precios ni impuestos. */
export interface PedidoDeVenta {
  /** Lo elige la app: repetir el envío no crea dos ventas. */
  readonly id: string;
  readonly lineas: readonly { readonly productoId: string; readonly cantidad: string }[];
  /** Un comprador del catálogo; null es consumidor final. */
  readonly compradorId: string | null;
  readonly medioDePago: MedioDePago;
}

/** Valida la forma del pedido. Un producto repetido se rechaza: la cantidad va en una sola línea. */
export function pedidoDeVenta(datos: {
  id: string;
  lineas: readonly { productoId: string; cantidad: string }[];
  compradorId: string | null;
  medioDePago: unknown;
}): PedidoDeVenta {
  if (!UUID.test(datos.id)) throw new ErrorDominio('venta.id-invalido', 'El id de la venta es un UUID en minúsculas');
  if (datos.lineas.length === 0 || datos.lineas.length > MAXIMO_DE_LINEAS) {
    throw new ErrorDominio('venta.lineas-invalidas', `La venta lleva de 1 a ${MAXIMO_DE_LINEAS} productos`);
  }
  if (datos.lineas.some((l) => !UUID.test(l.productoId))) {
    throw new ErrorDominio('venta.producto-invalido', 'Cada producto se identifica con su id');
  }
  if (new Set(datos.lineas.map((l) => l.productoId)).size !== datos.lineas.length) {
    throw new ErrorDominio('venta.producto-repetido', 'Cada producto va una sola vez, con su cantidad');
  }
  if (datos.compradorId !== null && !UUID.test(datos.compradorId)) {
    throw new ErrorDominio('venta.comprador-invalido', 'El comprador se identifica con su id');
  }
  return {
    id: datos.id,
    lineas: datos.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
    compradorId: datos.compradorId,
    medioDePago: medioDePago(datos.medioDePago),
  };
}

/**
 * Texto canónico del pedido, del que sale su huella: el mismo pedido da siempre el mismo texto. Sirve para que el
 * mismo id con otro contenido no pase por un reintento.
 */
export function textoCanonicoDe(pedido: PedidoDeVenta): string {
  return JSON.stringify([pedido.id, pedido.compradorId, pedido.medioDePago, pedido.lineas.map((l) => [l.productoId, l.cantidad])]);
}
