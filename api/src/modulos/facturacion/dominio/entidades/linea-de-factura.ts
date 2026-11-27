import { DecimalExacto, type Desglose, Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import { porcentajeDe, type TarifaIva } from '../objetos-valor/tarifa-iva.js';

/** Hasta 6 decimales en cantidades y precios unitarios (anexo técnico 1.9, tabla 5). */
const DECIMALES_DEL_PRECIO = 6;

interface DatosComunes {
  descripcion: string;
  cantidad: string;
  /** Código de unidad de la Recomendación 20 de UN/ECE; «94» es «unidad». */
  unidad?: string;
  /** Código interno del producto, si lo tiene. */
  codigo?: string | null;
}

/**
 * Línea de una factura con su valor sin IVA y su IVA, en pesos con 2 decimales.
 * `tarifaIva` es null si lo vendido está excluido del IVA: esa línea no lleva impuesto ni suma a la base gravable.
 */
export class LineaDeFactura {
  private constructor(
    readonly descripcion: string,
    readonly cantidad: DecimalExacto,
    readonly unidad: string,
    /** Valor de una unidad sin IVA (hasta 6 decimales). */
    readonly precioUnitario: Dinero,
    readonly tarifaIva: TarifaIva | null,
    readonly codigo: string | null,
    readonly valor: Dinero,
    readonly iva: Dinero,
  ) {}

  /** Desde el precio sin IVA: valor = precio × cantidad e IVA = valor × tarifa, cada uno redondeado (anexo, 5.2.1). */
  static crear(datos: DatosComunes & { precioUnitario: Dinero; tarifaIva: TarifaIva }): LineaDeFactura {
    const comunes = datosComunes(datos);
    if (datos.precioUnitario.esNegativo() || datos.precioUnitario.moneda !== 'COP') {
      throw new ErrorDominio('factura.precio-invalido', 'El precio unitario es un valor en pesos, cero o positivo');
    }
    const valor = datos.precioUnitario.multiplicarPor(comunes.cantidad).redondear();
    const iva = valor.porcentaje(porcentajeDe(datos.tarifaIva)).redondear();
    return new LineaDeFactura(comunes.descripcion, comunes.cantidad, comunes.unidad, datos.precioUnitario, datos.tarifaIva, comunes.codigo, valor, iva);
  }

  /**
   * Desde lo que paga el comprador, ya separado en base e IVA por el catálogo (HU-05.02). No recalcula nada: así
   * el total de la línea es exactamente el anunciado. El precio unitario sin IVA es la base entre la cantidad.
   */
  static desdeDesglose(datos: DatosComunes & { desglose: Desglose; tarifaIva: TarifaIva | null }): LineaDeFactura {
    const comunes = datosComunes(datos);
    const { base, iva, total } = datos.desglose;
    if (base.moneda !== 'COP' || base.esNegativo() || iva.esNegativo() || !base.sumar(iva).esIgualA(total)) {
      throw new ErrorDominio('factura.desglose-invalido', 'La base y el IVA de la línea suman exactamente su total');
    }
    if (datos.tarifaIva === null && !iva.esCero()) {
      throw new ErrorDominio('factura.desglose-invalido', 'Una línea excluida no lleva IVA');
    }
    const precioUnitario = Dinero.de(base.monto.dividir(comunes.cantidad, DECIMALES_DEL_PRECIO), base.moneda);
    return new LineaDeFactura(comunes.descripcion, comunes.cantidad, comunes.unidad, precioUnitario, datos.tarifaIva, comunes.codigo, base, iva);
  }

  /** Lo que paga el comprador por la línea. */
  get total(): Dinero {
    return this.valor.sumar(this.iva);
  }
}

function datosComunes(datos: DatosComunes): { descripcion: string; cantidad: DecimalExacto; unidad: string; codigo: string | null } {
  const descripcion = datos.descripcion.trim();
  if (descripcion.length === 0 || descripcion.length > 300) {
    throw new ErrorDominio('factura.descripcion-invalida', 'La descripción de la línea tiene de 1 a 300 caracteres');
  }
  const cantidad = DecimalExacto.desde(datos.cantidad);
  if (cantidad.esNegativo() || cantidad.esCero() || cantidad.decimalesSignificativos() > DECIMALES_DEL_PRECIO) {
    throw new ErrorDominio('factura.cantidad-invalida', 'La cantidad es positiva y tiene hasta 6 decimales');
  }
  const unidad = datos.unidad ?? '94';
  if (!/^[A-Z0-9]{1,3}$/.test(unidad)) {
    throw new ErrorDominio('factura.unidad-invalida', 'La unidad es un código de UN/ECE de 1 a 3 caracteres');
  }
  return { descripcion, cantidad, unidad, codigo: datos.codigo?.trim() || null };
}
