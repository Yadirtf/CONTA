import { Dinero } from '../../../../compartido/dominio/index.js';

/**
 * Valor de la UVT (unidad de valor tributario) por año gravable, como lo fija la DIAN cada diciembre.
 * - 2026: $52.374 (Resolución DIAN 000238 de 2025).
 *
 * Para agregar un año se suma una línea con su resolución. Si llega un año sin valor (por ejemplo el 1 de enero,
 * antes de actualizar esta tabla), se usa el último año conocido: la UVT nunca baja, así que el tope que sale es
 * igual o menor que el real y nunca se emite un tiquete POS que la norma no permita.
 */
const UVT_POR_ANIO: ReadonlyMap<number, string> = new Map([[2026, '52374']]);

const PRIMER_ANIO = Math.min(...UVT_POR_ANIO.keys());

/** La UVT del año de `fecha` (AAAA-MM-DD), o la del último año conocido antes de él. null antes del primero. */
export function uvtDe(fecha: string): Dinero | null {
  const anio = Number(fecha.slice(0, 4));
  if (!Number.isInteger(anio) || anio < PRIMER_ANIO) return null;
  for (let a = anio; a >= PRIMER_ANIO; a--) {
    const valor = UVT_POR_ANIO.get(a);
    if (valor !== undefined) return Dinero.de(valor);
  }
  return null;
}
