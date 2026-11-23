import { DecimalExacto, Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import { porcentajeDe, type TarifaIva } from '../objetos-valor/tarifa-iva.js';

/** Línea de una factura. Calcula su valor y su IVA redondeados a 2 decimales, mitad al par (anexo 1.9, 5.2.1). */
export class LineaDeFactura {
  private constructor(
    readonly descripcion: string,
    readonly cantidad: DecimalExacto,
    /** Código de unidad de la Recomendación 20 de UN/ECE; «94» es «unidad». */
    readonly unidad: string,
    readonly precioUnitario: Dinero,
    readonly tarifaIva: TarifaIva,
    /** Código interno del producto, si lo tiene. */
    readonly codigo: string | null,
    readonly valor: Dinero,
    readonly iva: Dinero,
  ) {}

  static crear(datos: {
    descripcion: string;
    cantidad: string;
    precioUnitario: Dinero;
    tarifaIva: TarifaIva;
    unidad?: string;
    codigo?: string | null;
  }): LineaDeFactura {
    const descripcion = datos.descripcion.trim();
    if (descripcion.length === 0 || descripcion.length > 300) {
      throw new ErrorDominio('factura.descripcion-invalida', 'La descripción de la línea tiene de 1 a 300 caracteres');
    }
    const cantidad = DecimalExacto.desde(datos.cantidad);
    if (cantidad.esNegativo() || cantidad.esCero() || cantidad.decimalesSignificativos() > 6) {
      throw new ErrorDominio('factura.cantidad-invalida', 'La cantidad es positiva y tiene hasta 6 decimales');
    }
    if (datos.precioUnitario.esNegativo() || datos.precioUnitario.moneda !== 'COP') {
      throw new ErrorDominio('factura.precio-invalido', 'El precio unitario es un valor en pesos, cero o positivo');
    }
    const unidad = datos.unidad ?? '94';
    if (!/^[A-Z0-9]{1,3}$/.test(unidad)) {
      throw new ErrorDominio('factura.unidad-invalida', 'La unidad es un código de UN/ECE de 1 a 3 caracteres');
    }
    const codigo = datos.codigo?.trim() || null;
    const valor = datos.precioUnitario.multiplicarPor(cantidad).redondear();
    const iva = valor.porcentaje(porcentajeDe(datos.tarifaIva)).redondear();
    return new LineaDeFactura(descripcion, cantidad, unidad, datos.precioUnitario, datos.tarifaIva, codigo, valor, iva);
  }
}
