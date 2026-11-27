import { Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { MomentoDeEmision } from '../objetos-valor/momento-de-emision.js';
import type { NumeroDeFactura } from '../objetos-valor/numero-de-factura.js';
import type { Participante } from '../objetos-valor/participante.js';
import { TARIFAS_IVA, type TarifaIva } from '../objetos-valor/tarifa-iva.js';
import type { LineaDeFactura } from './linea-de-factura.js';
import type { ResolucionDeNumeracion } from './resolucion-de-numeracion.js';

/** IVA de la factura agrupado por tarifa: base gravable y valor (suma de las líneas). */
export interface SubtotalIva {
  readonly tarifa: TarifaIva;
  readonly base: Dinero;
  readonly valor: Dinero;
}

export interface FormaDePago {
  readonly metodo: 'contado' | 'credito';
  /** Código del medio de pago de la DIAN: «10» efectivo, «42» consignación, «48» tarjeta crédito, ... */
  readonly medio: string;
  /** AAAA-MM-DD; obligatorio a crédito. */
  readonly vence: string | null;
}

/**
 * Factura electrónica de venta nacional (InvoiceTypeCode 01, operación estándar 10), en pesos.
 * Sus totales salen siempre de las líneas: nunca se reciben de afuera.
 */
export class Factura {
  readonly totalBruto: Dinero;
  readonly totalIva: Dinero;
  /** Suma de las bases de las tarifas de IVA (incluida la de 0 %): sin lo excluido. */
  readonly baseGravable: Dinero;
  readonly total: Dinero;
  readonly subtotalesIva: readonly SubtotalIva[];

  private constructor(
    readonly numero: NumeroDeFactura,
    readonly emision: MomentoDeEmision,
    readonly resolucion: ResolucionDeNumeracion,
    readonly emisor: Participante,
    readonly adquirente: Participante,
    readonly lineas: readonly LineaDeFactura[],
    readonly formaDePago: FormaDePago,
  ) {
    this.totalBruto = Dinero.total(lineas.map((l) => l.valor));
    this.totalIva = Dinero.total(lineas.map((l) => l.iva));
    this.total = this.totalBruto.sumar(this.totalIva);
    this.subtotalesIva = TARIFAS_IVA.flatMap((tarifa) => {
      const deLaTarifa = lineas.filter((l) => l.tarifaIva === tarifa);
      if (deLaTarifa.length === 0) return [];
      return [{ tarifa, base: Dinero.total(deLaTarifa.map((l) => l.valor)), valor: Dinero.total(deLaTarifa.map((l) => l.iva)) }];
    });
    this.baseGravable = Dinero.total(this.subtotalesIva.map((s) => s.base));
  }

  static emitir(datos: {
    numero: NumeroDeFactura;
    emision: MomentoDeEmision;
    resolucion: ResolucionDeNumeracion;
    emisor: Participante;
    adquirente: Participante;
    lineas: readonly LineaDeFactura[];
    formaDePago: FormaDePago;
  }): Factura {
    const { numero, emision, resolucion, emisor, adquirente, lineas, formaDePago } = datos;
    resolucion.exigirQueAutorice(numero, emision.fecha);
    if (!emisor.identificacion.esNit()) {
      throw new ErrorDominio('factura.emisor-sin-nit', 'El facturador electrónico se identifica con NIT');
    }
    if (!emisor.direccion) throw new ErrorDominio('factura.emisor-sin-direccion', 'El emisor necesita dirección');
    if (lineas.length === 0) throw new ErrorDominio('factura.sin-lineas', 'La factura necesita al menos una línea');
    if (!/^[A-Z0-9]{1,3}$/.test(formaDePago.medio)) {
      throw new ErrorDominio('factura.medio-de-pago-invalido', 'El medio de pago es un código de la DIAN');
    }
    if (formaDePago.metodo === 'credito' && (formaDePago.vence === null || formaDePago.vence < emision.fecha)) {
      throw new ErrorDominio('factura.vencimiento-invalido', 'A crédito, el vencimiento es igual o posterior a la emisión');
    }
    return new Factura(numero, emision, resolucion, emisor, adquirente, [...lineas], formaDePago);
  }
}
