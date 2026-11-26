import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/**
 * Unidades con las que se vende, en códigos de la Recomendación 20 de UN/ECE que pide la factura electrónica.
 * Lista cerrada: un código que la DIAN no conoce rechazaría la factura.
 */
export const UNIDADES_DE_MEDIDA = {
  '94': 'Unidad',
  KGM: 'Kilogramo',
  GRM: 'Gramo',
  LBR: 'Libra',
  LTR: 'Litro',
  MLT: 'Mililitro',
  MTR: 'Metro',
  HUR: 'Hora',
} as const;

export type UnidadDeMedida = keyof typeof UNIDADES_DE_MEDIDA;

export const UNIDAD_POR_DEFECTO: UnidadDeMedida = '94';

export function esUnidadDeMedida(valor: unknown): valor is UnidadDeMedida {
  return typeof valor === 'string' && Object.hasOwn(UNIDADES_DE_MEDIDA, valor);
}

export function unidadDeMedida(valor: string | null): UnidadDeMedida {
  if (valor === null) return UNIDAD_POR_DEFECTO;
  if (!esUnidadDeMedida(valor)) {
    throw new ErrorDominio('producto.unidad-invalida', `La unidad es una de: ${Object.keys(UNIDADES_DE_MEDIDA).join(', ')}`);
  }
  return valor;
}
