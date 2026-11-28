import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { Dinero } from '../../../../compartido/dominio/index.js';
import type { ClaseDeDocumento } from './clase-de-documento.js';
import { cabeEnPos } from './tope-del-pos.js';

/**
 * Lo que pide quien vende (HU-06.02). `automatico`: el tiquete POS si se puede, si no la factura. `factura`: el
 * comprador pidió factura electrónica. Nunca se puede pedir POS a la fuerza: así no sale un tiquete por encima del
 * tope ni a quien pidió factura (decisión del ADR-0016).
 */
export const PREFERENCIAS_DE_DOCUMENTO = ['automatico', 'factura'] as const;
export type PreferenciaDeDocumento = (typeof PREFERENCIAS_DE_DOCUMENTO)[number];

export function preferenciaDeDocumento(valor: unknown): PreferenciaDeDocumento {
  if (!(PREFERENCIAS_DE_DOCUMENTO as readonly unknown[]).includes(valor)) {
    throw new ErrorDominio('venta.documento-invalido', 'El documento es automatico o factura');
  }
  return valor as PreferenciaDeDocumento;
}

export interface CircunstanciasDeLaVenta {
  readonly preferencia: PreferenciaDeDocumento;
  /** true si se eligió un comprador del catálogo: lo que quiere es una factura a su nombre. */
  readonly conComprador: boolean;
  /** Lo vendido sin impuestos. */
  readonly base: Dinero;
  /** Fecha de emisión, AAAA-MM-DD (hora de Colombia): de ella sale la UVT. */
  readonly fecha: string;
  /** La empresa tiene el POS habilitado y una resolución POS vigente con números. */
  readonly posDisponible: boolean;
  /** El dueño pidió en la configuración DIAN que nunca salga tiquete POS (HU-07.04, ADR-0016). */
  readonly siempreFactura: boolean;
}

/**
 * Qué documento sale. El tiquete POS solo si se dejó en automático, es a consumidor final, el negocio lo tiene
 * habilitado, el dueño no pidió «siempre factura» y la base cabe en 5 UVT; en cualquier otro caso, factura
 * electrónica, que siempre es válida.
 */
export function claseParaLaVenta(c: CircunstanciasDeLaVenta): ClaseDeDocumento {
  const pos =
    c.preferencia === 'automatico' && !c.conComprador && c.posDisponible && !c.siempreFactura && cabeEnPos(c.base, c.fecha);
  return pos ? 'pos' : 'factura';
}
