import type { Sesion } from '../sesion.js';
import { POLITICA_DE_SEGUNDO_FACTOR as P } from './politica-de-segundo-factor.js';

/**
 * Hasta cuándo vale el segundo factor de una sesión (HU-04.04): una jornada desde que se verificó, nunca más
 * allá de la sesión misma. null si nunca se verificó en esa sesión.
 */
export function segundoFactorHasta(sesion: Sesion): Date | null {
  if (!sesion.verificadaEn) return null;
  const jornada = sesion.verificadaEn.getTime() + P.vigenciaDeLaVerificacionMs;
  return new Date(Math.min(jornada, sesion.venceEn.getTime()));
}

/** true si la sesión pasó el segundo factor y la verificación sigue vigente. */
export function tieneSegundoFactorVigente(sesion: Sesion, ahora: Date): boolean {
  const hasta = segundoFactorHasta(sesion);
  return hasta !== null && ahora.getTime() < hasta.getTime();
}

/** true si la sesión verificó hace poco: lo exige cambiar de app autenticadora. */
export function verificoHacePoco(sesion: Sesion, ahora: Date): boolean {
  return sesion.verificadaEn !== null && ahora.getTime() - sesion.verificadaEn.getTime() < P.verificacionRecienteMs;
}
