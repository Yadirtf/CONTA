// Ventas (HU-06.01): lo que se vende en el mostrador y de donde sale la factura electrónica.
export type { ArticuloDelCatalogo } from './articulo-del-catalogo.js';
export { estadoDeLaVenta, type EstadoDeLaVenta } from './estado-de-la-venta.js';
export {
  MAXIMO_DE_LINEAS,
  MAXIMO_DE_VENTAS_POR_EMPRESA_AL_DIA,
  MAXIMO_DE_VENTAS_POR_PERSONA_AL_DIA,
  TOTAL_MAXIMO,
  UN_DIA_EN_MS,
} from './limites-de-ventas.js';
export { lineaDeVenta, type LineaDeVenta } from './linea-de-venta.js';
export { codigoDianDe, MEDIOS_DE_PAGO, medioDePago, type MedioDePago } from './medio-de-pago.js';
export { pedidoDeVenta, type PedidoDeVenta, textoCanonicoDe } from './pedido-de-venta.js';
export { type DatosDeVenta, Venta } from './venta.js';
