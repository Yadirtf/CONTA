import { Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { ClaseDeDocumento } from '../documentos/clase-de-documento.js';
import type { PuntoDeVenta } from '../documentos/punto-de-venta.js';
import { cabeEnPos } from '../documentos/tope-del-pos.js';
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
 * Documento electrónico de una venta nacional en pesos: la factura electrónica de venta (InvoiceTypeCode 01) o el
 * tiquete POS electrónico (documento equivalente, InvoiceTypeCode 20), según la clase de su resolución (HU-06.02).
 * Los dos comparten estructura UBL; sus totales salen siempre de las líneas: nunca se reciben de afuera.
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
    /** La caja de la venta: solo el tiquete POS la lleva. */
    readonly puntoDeVenta: PuntoDeVenta | null,
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

  /** La clase la fija la resolución: un número POS solo puede ser de un tiquete POS. */
  get clase(): ClaseDeDocumento {
    return this.resolucion.clase;
  }

  static emitir(datos: {
    numero: NumeroDeFactura;
    emision: MomentoDeEmision;
    resolucion: ResolucionDeNumeracion;
    emisor: Participante;
    adquirente: Participante;
    lineas: readonly LineaDeFactura[];
    formaDePago: FormaDePago;
    puntoDeVenta?: PuntoDeVenta | null;
  }): Factura {
    const { numero, emision, resolucion, emisor, adquirente, lineas, formaDePago } = datos;
    const puntoDeVenta = resolucion.clase === 'pos' ? (datos.puntoDeVenta ?? null) : null;
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
    const documento = new Factura(numero, emision, resolucion, emisor, adquirente, [...lineas], formaDePago, puntoDeVenta);
    if (documento.clase === 'pos') exigirTiquetePosValido(documento);
    return documento;
  }
}

/** El tiquete POS lleva su caja y no pasa de 5 UVT sin impuestos (ET 616-1, parágrafo 2). */
function exigirTiquetePosValido(documento: Factura): void {
  if (!documento.puntoDeVenta) {
    throw new ErrorDominio('pos.punto-de-venta-incompleto', 'El tiquete POS necesita los datos de la caja');
  }
  if (!cabeEnPos(documento.totalBruto, documento.emision.fecha)) {
    throw new ErrorDominio('pos.tope-excedido', 'El tiquete POS no puede pasar de 5 UVT sin impuestos: emite factura');
  }
}
