import { ErrorDominio } from '../error-dominio.js';
import { esTarifaIva, type TarifaIva } from './tarifa-iva.js';

/**
 * Cómo trata el IVA a un producto (HU-05.02). Lista cerrada: cada caso sale de la ley, ninguna empresa inventa
 * otro.
 * - gravado: causa IVA a la tarifa de 19 % o 5 % (ET arts. 468 y 468-1).
 * - exento: gravado a tarifa 0 % (ET arts. 477 y 481). Va en la factura con IVA 0 %.
 * - excluido: no causa IVA (ET arts. 424 y 476). No va en el IVA de la factura ni en su base gravable.
 * El tipo y la tarifa van separados: si una reforma cambia una tarifa, ningún nombre queda mintiendo.
 */
export const TIPOS_DE_IVA = ['gravado', 'exento', 'excluido'] as const;
export type TipoDeIva = (typeof TIPOS_DE_IVA)[number];

/** Tarifas con las que un producto puede ser gravado; la de 0 % es la de los exentos. */
export const TARIFAS_DE_GRAVADO = ['19', '5'] as const satisfies readonly TarifaIva[];

export type TratamientoDeIva =
  | { readonly tipo: 'gravado'; readonly tarifa: (typeof TARIFAS_DE_GRAVADO)[number] }
  | { readonly tipo: 'exento'; readonly tarifa: '0' }
  | { readonly tipo: 'excluido'; readonly tarifa: null };

export function esTipoDeIva(valor: unknown): valor is TipoDeIva {
  return typeof valor === 'string' && (TIPOS_DE_IVA as readonly string[]).includes(valor);
}

/**
 * Arma el tratamiento: gravado exige 19 o 5; exento y excluido no llevan tarifa (exento es 0 % por ley).
 * Una tarifa escrita con exento o excluido se rechaza, para no guardar algo que se contradice.
 */
export function tratamientoDeIva(tipo: TipoDeIva, tarifa: string | null): TratamientoDeIva {
  if (tipo === 'gravado') {
    if (!esTarifaDeGravado(tarifa)) {
      throw new ErrorDominio('iva.tarifa-invalida', 'Un producto con IVA lleva la tarifa de 19 % o 5 %');
    }
    return { tipo, tarifa };
  }
  if (tarifa !== null && !(tipo === 'exento' && tarifa === '0')) {
    throw new ErrorDominio('iva.tarifa-invalida', 'Un producto exento o excluido no lleva tarifa');
  }
  return tipo === 'exento' ? { tipo, tarifa: '0' } : { tipo, tarifa: null };
}

/** ¿Se le suma IVA? Solo a los gravados: exentos (0 %) y excluidos no cobran impuesto. */
export function cobraIva(tratamiento: TratamientoDeIva): tratamiento is Extract<TratamientoDeIva, { tipo: 'gravado' }> {
  return tratamiento.tipo === 'gravado';
}

function esTarifaDeGravado(valor: string | null): valor is (typeof TARIFAS_DE_GRAVADO)[number] {
  return esTarifaIva(valor) && (TARIFAS_DE_GRAVADO as readonly string[]).includes(valor);
}
