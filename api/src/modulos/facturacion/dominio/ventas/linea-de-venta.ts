import { DecimalExacto, type Desglose, desglosarDesdeTotal, ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { ArticuloDelCatalogo } from './articulo-del-catalogo.js';
import { TOTAL_MAXIMO } from './limites-de-ventas.js';

const CANTIDAD = /^\d{1,7}(\.\d{1,6})?$/;
const CANTIDAD_MAXIMA = DecimalExacto.desde('1000000');

/** Una línea vendida: el artículo como estaba en el catálogo, la cantidad y lo que se cobra, ya separado. */
export interface LineaDeVenta {
  readonly articulo: ArticuloDelCatalogo;
  readonly cantidad: DecimalExacto;
  readonly desglose: Desglose;
}

/**
 * Arma la línea: el total es precio × cantidad, redondeado una vez, y se separa en base e IVA con la misma regla
 * del catálogo (HU-05.02), así que el comprador paga exactamente lo anunciado.
 */
export function lineaDeVenta(articulo: ArticuloDelCatalogo, cantidad: string): LineaDeVenta {
  if (!CANTIDAD.test(cantidad)) throw cantidadInvalida();
  const unidades = DecimalExacto.desde(cantidad);
  if (unidades.esCero() || unidades.comparar(CANTIDAD_MAXIMA) > 0) throw cantidadInvalida();
  const desglose = desglosarDesdeTotal(articulo.precio.multiplicarPor(unidades), articulo.iva);
  if (desglose.total.esCero()) throw cantidadInvalida();
  if (desglose.total.monto.comparar(TOTAL_MAXIMO) > 0) {
    throw new ErrorDominio('venta.total-excedido', 'Una venta no puede pasar de $1.000.000.000');
  }
  return { articulo, cantidad: unidades, desglose };
}

const cantidadInvalida = () =>
  new ErrorDominio('venta.cantidad-invalida', 'La cantidad es mayor que cero, hasta 1.000.000, con hasta 6 decimales, y vale al menos un centavo');
