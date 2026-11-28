import { ErrorDominio } from '../error-dominio.js';

/**
 * Qué tan fresca está la verificación en dos pasos de la sesión que hace la petición (HU-04.04 y HU-07.04):
 * - `sin-verificar`: nunca la pasó o ya venció (12 h);
 * - `vigente`: la pasó en esta jornada;
 * - `reciente`: la pasó hace 10 minutos o menos.
 * Lo calcula identidad con la sesión de cada petición; aquí solo se compara.
 */
export const NIVELES_DE_SEGUNDO_FACTOR = ['sin-verificar', 'vigente', 'reciente'] as const;
export type SegundoFactorDeLaSesion = (typeof NIVELES_DE_SEGUNDO_FACTOR)[number];

export const CODIGO_SIN_SEGUNDO_FACTOR = 'acceso.segundo-factor-requerido';
export const CODIGO_SIN_SEGUNDO_FACTOR_RECIENTE = 'acceso.segundo-factor-reciente-requerido';

/**
 * Falla si la sesión no alcanza el nivel pedido. Sin dato, cuenta como sin verificar: se niega por defecto. Los casos
 * de uso que tocan secretos (PIN del software, clave técnica) piden `reciente`; leerlos, `vigente`.
 */
export function exigirSegundoFactor(actual: SegundoFactorDeLaSesion | undefined, pedido: Exclude<SegundoFactorDeLaSesion, 'sin-verificar'>): void {
  const nivel = NIVELES_DE_SEGUNDO_FACTOR.indexOf(actual ?? 'sin-verificar');
  if (nivel >= NIVELES_DE_SEGUNDO_FACTOR.indexOf(pedido)) return;
  if (pedido === 'reciente' && actual === 'vigente') {
    throw new ErrorDominio(CODIGO_SIN_SEGUNDO_FACTOR_RECIENTE, 'Confirma otra vez que eres tú con tu app de verificación');
  }
  throw new ErrorDominio(CODIGO_SIN_SEGUNDO_FACTOR, 'Confirma que eres tú con tu app de verificación');
}
