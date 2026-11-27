import type { IdEmpresa } from '../../../../compartido/dominio/index.js';

/** Una venta guardada a la que le falta firmar y encolar su documento. */
export interface EmisionPendiente {
  readonly empresaId: IdEmpresa;
  readonly ventaId: string;
}

/** Bandeja de emisiones dentro de la transacción de la empresa: se encola junto con la venta o no ocurre. */
export interface ColaDeEmisiones {
  encolar(ventaId: string, cuando: Date): Promise<void>;
  completar(ventaId: string): Promise<void>;
}

/** Toma, de todas las empresas, las emisiones vencidas y las reserva un rato (como la cola de envíos). */
export interface FuenteDeEmisionesPendientes {
  tomarVencidas(ahora: Date, limite: number): Promise<EmisionPendiente[]>;
}

export const FUENTE_DE_EMISIONES_PENDIENTES = Symbol('FuenteDeEmisionesPendientes');
