import type { ContextoEmpresa } from '../../aplicacion/index.js';

/** Datos de la petición HTTP que un resolutor puede mirar (encabezados ya en minúsculas). */
export interface PeticionHttp {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/** Encabezado con el que cada petición dice en qué empresa trabaja (HU-04.02, ADR-0011). */
export const ENCABEZADO_DE_EMPRESA = 'x-empresa';

/**
 * Por qué una petición no corre en ninguna empresa:
 * - sin-sesion: no prueba quién es (401);
 * - sin-empresa-elegida: tiene sesión pero no dice en qué empresa trabaja (400);
 * - empresa-ajena: la empresa no existe, está mal escrita o la persona no es miembro (404, sin distinguir).
 */
export type RechazoDeEmpresa = 'sin-sesion' | 'sin-empresa-elegida' | 'empresa-ajena';

export type ResolucionDeEmpresa = { readonly contexto: ContextoEmpresa } | { readonly rechazo: RechazoDeEmpresa };

/**
 * Decide en nombre de qué empresa corre una petición (HU-01.05, ADR-0006). La implementación real cruza la
 * sesión con la membresía (HU-04.02, ADR-0011) y vive en el módulo de empresas. Nunca adivina una empresa.
 */
export interface ResolutorDeEmpresa {
  resolver(peticion: PeticionHttp): Promise<ResolucionDeEmpresa>;
}

export const RESOLUTOR_DE_EMPRESA = Symbol('ResolutorDeEmpresa');
