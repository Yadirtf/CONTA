import type { Dinero, TratamientoDeIva } from '../../../../compartido/dominio/index.js';

/**
 * Lo que la venta toma de un producto del catálogo en el momento de vender (HU-05.02): nombre, código, unidad,
 * precio con IVA incluido y cómo lo trata el IVA. Lo entrega el catálogo; nunca llega de la app.
 */
export interface ArticuloDelCatalogo {
  readonly productoId: string;
  readonly nombre: string;
  readonly codigo: string | null;
  /** Código de unidad UN/ECE («94» es unidad). */
  readonly unidad: string;
  readonly precio: Dinero;
  readonly iva: TratamientoDeIva;
}
