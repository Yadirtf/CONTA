import type { ComprobanteDeVenta } from '../../dominio/index.js';

/** Dibuja el comprobante de una venta en PDF (HU-06.08). Solo dibuja: todos los valores llegan ya en texto. */
export interface RenderizadorDeComprobante {
  pdf(comprobante: ComprobanteDeVenta): Promise<Uint8Array>;
}

export const RENDERIZADOR_DE_COMPROBANTE = Symbol('RenderizadorDeComprobante');
