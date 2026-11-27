import { DecimalExacto } from '../../../../compartido/dominio/index.js';

/** Productos distintos en una venta: suficiente para un mercado grande y acota el tamaño del documento. */
export const MAXIMO_DE_LINEAS = 100;

/** Tope de una venta (y de cada línea): $1.000.000.000. Cabe holgado en numeric(14,2) y en el XML. */
export const TOTAL_MAXIMO = DecimalExacto.desde('1000000000');

/** Ventas nuevas por empresa en 24 horas, y por persona al día sumando sus empresas (contra un guion que agote el rango). */
export const MAXIMO_DE_VENTAS_POR_EMPRESA_AL_DIA = 3000;
export const MAXIMO_DE_VENTAS_POR_PERSONA_AL_DIA = 3000;

export const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;
