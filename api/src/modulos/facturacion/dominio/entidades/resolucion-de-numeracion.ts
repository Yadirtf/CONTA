import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { ClaseDeDocumento } from '../documentos/clase-de-documento.js';
import type { NumeroDeFactura } from '../objetos-valor/numero-de-factura.js';

/**
 * Resolución de numeración que la DIAN autorizó al facturador (sts:InvoiceControl). La DIAN autoriza cada rango para
 * una clase de documento: los números de una resolución POS solo sirven para tiquetes POS (HU-06.02).
 * La clave técnica del rango no vive aquí: es reservada y solo la conoce la infraestructura que calcula el CUFE.
 */
export class ResolucionDeNumeracion {
  private constructor(
    readonly numero: string,
    readonly prefijo: string,
    readonly desde: number,
    readonly hasta: number,
    /** AAAA-MM-DD */
    readonly vigenteDesde: string,
    /** AAAA-MM-DD */
    readonly vigenteHasta: string,
    readonly clase: ClaseDeDocumento,
  ) {}

  static crear(datos: {
    numero: string;
    prefijo: string;
    desde: number;
    hasta: number;
    vigenteDesde: string;
    vigenteHasta: string;
    /** Por omisión, factura: así eran todas las resoluciones antes del POS. */
    clase?: ClaseDeDocumento;
  }): ResolucionDeNumeracion {
    const { numero, prefijo, desde, hasta, vigenteDesde, vigenteHasta, clase = 'factura' } = datos;
    if (!/^\d{1,14}$/.test(numero)) {
      throw new ErrorDominio('resolucion.numero-invalido', 'El número de la resolución tiene hasta 14 dígitos');
    }
    if (!Number.isSafeInteger(desde) || !Number.isSafeInteger(hasta) || desde < 1 || hasta < desde) {
      throw new ErrorDominio('resolucion.rango-invalido', 'El rango autorizado va de un entero positivo a otro mayor o igual');
    }
    if (!esFecha(vigenteDesde) || !esFecha(vigenteHasta) || vigenteHasta < vigenteDesde) {
      throw new ErrorDominio('resolucion.vigencia-invalida', 'La vigencia va de una fecha AAAA-MM-DD a otra igual o posterior');
    }
    return new ResolucionDeNumeracion(numero, prefijo, desde, hasta, vigenteDesde, vigenteHasta, clase);
  }

  /** Reglas FAB07, FAB08, FAB10 a FAB12 del anexo técnico: mismo prefijo, número dentro del rango y fecha vigente. */
  exigirQueAutorice(numero: NumeroDeFactura, fecha: string): void {
    if (numero.prefijo !== this.prefijo) {
      throw new ErrorDominio('factura.prefijo-no-autorizado', `El prefijo ${numero.prefijo} no es el de la resolución ${this.numero}`);
    }
    if (numero.consecutivo < this.desde || numero.consecutivo > this.hasta) {
      throw new ErrorDominio('factura.fuera-de-rango', `El número ${numero.aTexto()} está fuera del rango autorizado`);
    }
    if (fecha < this.vigenteDesde || fecha > this.vigenteHasta) {
      throw new ErrorDominio('factura.resolucion-vencida', `La resolución ${this.numero} no está vigente el ${fecha}`);
    }
  }
}

function esFecha(texto: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && new Date(`${texto}T00:00:00Z`).toISOString().startsWith(texto);
}
