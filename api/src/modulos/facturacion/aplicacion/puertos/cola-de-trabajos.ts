import type { IdEmpresa } from '../../../../compartido/dominio/index.js';

/** Trabajo pendiente: procesar el envío X de la empresa Y. Lleva su empresa explícita (ADR-0006). */
export interface TrabajoDeEnvio {
  readonly empresaId: IdEmpresa;
  readonly envioId: string;
}

/**
 * Cola durable de trabajos con la DIAN, dentro de la transacción de la empresa: encolar se confirma
 * junto con el envío o no ocurre (bandeja de salida). El adaptador durable definitivo es de HU-06.04.
 */
export interface ColaDeTrabajos {
  encolar(trabajo: TrabajoDeEnvio, cuando: Date): Promise<void>;
  /** El trabajo terminó (estado final): sale de la cola. */
  completar(trabajo: TrabajoDeEnvio): Promise<void>;
}

/** Toma, de todas las empresas, los trabajos vencidos y los reserva un rato para que nadie más los tome. */
export interface FuenteDeTrabajosVencidos {
  tomarVencidos(ahora: Date, limite: number): Promise<TrabajoDeEnvio[]>;
}

/** Despierta el procesamiento en `cuando` dentro del proceso; si el proceso muere, lo recupera la cola. */
export interface Despertador {
  programar(cuando: Date): void;
}

export const FUENTE_DE_TRABAJOS_VENCIDOS = Symbol('FuenteDeTrabajosVencidos');
export const DESPERTADOR = Symbol('Despertador');
