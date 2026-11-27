import { ErrorDominio } from '../../../../compartido/dominio/index.js';

// Rechazos de una venta que dependen de lo guardado (no de la forma del pedido). Códigos estables para la app.

export const ventaConOtroPedido = () =>
  new ErrorDominio('venta.id-en-uso', 'Ese id ya es de otra venta con otros productos: la app debe usar un id nuevo');

export const productoNoEncontrado = () =>
  new ErrorDominio('venta.producto-no-encontrado', 'Uno de los productos ya no está en el catálogo: vuelve a cargar la lista');

export const compradorNoEncontrado = () =>
  new ErrorDominio('venta.comprador-no-encontrado', 'Ese comprador no está en el negocio: búscalo otra vez');

export const facturacionNoHabilitada = () =>
  new ErrorDominio('facturacion.no-habilitada', 'Tu negocio todavía no está listo para facturar ante la DIAN');

export const sinResolucionVigente = () =>
  new ErrorDominio('facturacion.sin-numeracion', 'No hay números de factura disponibles: pide una resolución nueva a la DIAN');

export const limiteDiarioDeVentas = () =>
  new ErrorDominio('venta.limite-diario', 'Llegaste al máximo de ventas del día. Si es un error, escríbenos');

export const limiteDeVentasPorPersona = () =>
  new ErrorDominio('venta.limite-por-persona', 'Llegaste al máximo de ventas del día. Si es un error, escríbenos');

export const ventaNoEncontrada = () => new ErrorDominio('venta.no-encontrada', 'No encontramos esa venta');

/** Otra petición con el mismo id ganó la carrera: se deshace esta transacción (y su número) y se lee la ganadora. */
export class ChoqueDeVenta extends Error {
  constructor() {
    super('Otra petición guardó primero una venta con este id');
    this.name = 'ChoqueDeVenta';
  }
}
