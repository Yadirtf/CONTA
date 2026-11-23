import type { ContextoEmpresa } from '../../aplicacion/index.js';

/** Datos de la petición HTTP que un resolutor puede mirar (encabezados ya en minúsculas). */
export interface PeticionHttp {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/**
 * Decide en nombre de qué empresa corre una petición (HU-01.05, ADR-0006).
 * La implementación real sale de la identidad del usuario y su membresía (EP-04). Devuelve null si
 * la petición no prueba pertenecer a ninguna empresa; la guarda responde entonces 401.
 */
export interface ResolutorDeEmpresa {
  resolver(peticion: PeticionHttp): ContextoEmpresa | null | Promise<ContextoEmpresa | null>;
}

export const RESOLUTOR_DE_EMPRESA = Symbol('ResolutorDeEmpresa');

/**
 * Resolutor por defecto mientras no existe la identidad (EP-04): ninguna petición tiene empresa,
 * así que todo endpoint con datos de empresa responde 401. Falla cerrado: nunca adivina una empresa.
 * Las pruebas e2e lo reemplazan con uno falso que vive en test/ y por eso nunca llega a producción.
 */
export class ResolutorSinIdentidad implements ResolutorDeEmpresa {
  resolver(): null {
    return null;
  }
}
