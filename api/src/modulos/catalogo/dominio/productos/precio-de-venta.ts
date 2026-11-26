import { DecimalExacto, desglosarDesdeBase, Dinero, ErrorDominio, type TratamientoDeIva } from '../../../../compartido/dominio/index.js';

/** Un precio en pesos con centavos como mucho: es lo que se cobra, no un valor intermedio. */
const PRECIO = /^\d{1,10}(\.\d{1,2})?$/;
const PRECIO_MAXIMO = DecimalExacto.desde('1000000000');

/**
 * Precio de venta de un producto (HU-05.02): siempre el final, con el IVA ya incluido, porque es lo que paga el
 * comprador y lo que la ley pide mostrar (Ley 1480, art. 26). Quien piensa en «precio más IVA» lo escribe sin
 * IVA y se convierte aquí una sola vez, redondeando el IVA a centavos; el que se guarda es el final.
 */
export function precioDeVenta(texto: string, incluyeIva: boolean, tratamiento: TratamientoDeIva): Dinero {
  const escrito = montoEscrito(texto);
  const final = incluyeIva ? escrito : desglosarDesdeBase(escrito, tratamiento).total;
  if (final.monto.comparar(PRECIO_MAXIMO) > 0) throw precioInvalido();
  return final;
}

function montoEscrito(texto: string): Dinero {
  if (!PRECIO.test(texto)) throw precioInvalido();
  const monto = Dinero.de(texto);
  if (monto.esCero() || monto.monto.comparar(PRECIO_MAXIMO) > 0) throw precioInvalido();
  return monto;
}

const precioInvalido = () =>
  new ErrorDominio('producto.precio-invalido', 'El precio es un valor en pesos mayor que cero, con centavos como mucho, hasta $1.000.000.000');
