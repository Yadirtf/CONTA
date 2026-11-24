import { POLITICA_DE_ACCESO } from './politica-de-acceso.js';
import type { IdUsuario } from './usuario.js';

/**
 * Sesión abierta en un dispositivo. El token solo lo conoce el dispositivo; la base guarda su huella (SHA-256),
 * así que leer la base no permite entrar. Se cierra revocándola: nunca se borra.
 */
export interface Sesion {
  readonly id: string;
  readonly usuarioId: IdUsuario;
  readonly creadaEn: Date;
  readonly venceEn: Date;
}

export function abrirSesion(id: string, usuarioId: IdUsuario, ahora: Date): Sesion {
  return { id, usuarioId, creadaEn: ahora, venceEn: new Date(ahora.getTime() + POLITICA_DE_ACCESO.vigenciaDeLaSesionMs) };
}
