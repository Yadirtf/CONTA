import type { Dinero } from '../../../../../compartido/dominio/index.js';

/** Monto con exactamente 2 decimales. Los totales ya vienen redondeados; truncar es lo que pide el CUFE (11.2). */
export function monto(d: Dinero): string {
  return d.monto.redondear(2, 'hacia-cero').aTexto(2);
}
