import type { Celular } from '../../dominio/index.js';

/**
 * Entrega el código a la persona (ADR-0010: WhatsApp primero; SMS detrás de este mismo puerto).
 * Lanza FallaDeEnvio si el canal no lo aceptó. Nunca escribe el código en un registro.
 */
export interface EnviadorDeCodigos {
  enviar(celular: Celular, codigo: string): Promise<void>;
}

export class FallaDeEnvio extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'FallaDeEnvio';
  }
}

export const ENVIADOR_DE_CODIGOS = Symbol('EnviadorDeCodigos');
