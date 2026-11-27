import type { Dinero } from '../../../../compartido/dominio/index.js';
import { uvtDe } from './valor-de-la-uvt.js';

/** UVT que puede valer, como máximo, cada tiquete POS (Estatuto Tributario, art. 616-1, parágrafo 2). */
export const UVT_MAXIMAS_DEL_POS = 5;

/** El tope del tiquete POS en la fecha (AAAA-MM-DD), sin impuestos; null si no hay UVT para esa fecha. */
export function topeDelPos(fecha: string): Dinero | null {
  return uvtDe(fecha)?.multiplicarPor(String(UVT_MAXIMAS_DEL_POS)) ?? null;
}

/**
 * ¿Una venta con esta base (sin impuestos) cabe en un tiquete POS? El tope se compara sin incluir el importe de
 * ningún impuesto, como dice la norma, y vale el mismo tope: una base igual a 5 UVT sí cabe.
 */
export function cabeEnPos(base: Dinero, fecha: string): boolean {
  const tope = topeDelPos(fecha);
  return tope !== null && base.comparar(tope) <= 0;
}
