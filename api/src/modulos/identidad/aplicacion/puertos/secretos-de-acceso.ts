import type { Celular } from '../../dominio/index.js';

/** Crea el código que se envía. Al azar con un generador criptográfico; fijo solo para celulares de prueba. */
export interface GeneradorDeCodigos {
  nuevo(celular: Celular): string;
}

/**
 * Huellas de los secretos de acceso. El código se guarda como HMAC con una clave del entorno y el token de
 * sesión como SHA-256: quien lea la base no puede usar ninguno. Las comparaciones toman tiempo constante.
 */
export interface HuellasDeAcceso {
  huellaDeCodigo(celular: Celular, codigo: string): string;
  coincideCodigo(celular: Celular, codigo: string, huella: string): boolean;
  nuevoToken(): string;
  huellaDeToken(token: string): string;
  nuevoId(): string;
}

export const GENERADOR_DE_CODIGOS = Symbol('GeneradorDeCodigos');
export const HUELLAS_DE_ACCESO = Symbol('HuellasDeAcceso');
