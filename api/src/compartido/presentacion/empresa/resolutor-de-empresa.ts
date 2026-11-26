import type { ContextoDeMiembro } from '../../aplicacion/index.js';

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
 * - empresa-ajena: la empresa no existe, está mal escrita o la persona no es miembro activo (404, sin distinguir);
 * - sin-segundo-factor: es contador o está en modo contador y la sesión no pasó el segundo factor (403, HU-04.04);
 * - sin-permiso: es miembro, pero su rol no tiene el permiso que pide el endpoint (403, HU-04.03).
 */
export type RechazoDeEmpresa = 'sin-sesion' | 'sin-empresa-elegida' | 'empresa-ajena' | 'sin-segundo-factor' | 'sin-permiso';

/** El resolutor nunca responde sin-permiso: eso lo decide la guarda con el permiso del endpoint. */
export type ResolucionDeEmpresa =
  | { readonly contexto: ContextoDeMiembro }
  | { readonly rechazo: Exclude<RechazoDeEmpresa, 'sin-permiso'> };

/**
 * Decide en nombre de qué empresa y de qué miembro corre una petición (HU-01.05, ADR-0006). La implementación
 * real cruza la sesión con la membresía activa y su rol (HU-04.02 y HU-04.03, ADR-0011 y ADR-0012), exige el
 * segundo factor a quien trabaja como contador (HU-04.04, ADR-0013) y vive en el módulo de empresas. Nunca
 * adivina una empresa.
 */
export interface ResolutorDeEmpresa {
  resolver(peticion: PeticionHttp): Promise<ResolucionDeEmpresa>;
}

export const RESOLUTOR_DE_EMPRESA = Symbol('ResolutorDeEmpresa');
