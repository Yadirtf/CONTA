import type { IdUsuario } from '../../../../compartido/dominio/index.js';

/**
 * Personas de CONTA vistas desde empresas (HU-04.03). Lo implementa el módulo de identidad por su API
 * pública: empresas nunca lee las tablas de identidad.
 */
export interface DirectorioDePersonas {
  /**
   * Id de la persona con ese celular; si no existe, la registra (entrará con su código como cualquiera).
   * Responde igual en los dos casos. Falla con acceso.celular-invalido si el número no es válido.
   */
  registrar(celular: string): Promise<IdUsuario>;
  /** Celular enmascarado (+57 300 *** 4567) de cada persona, por el valor de su id. */
  celularesDe(ids: readonly IdUsuario[]): Promise<ReadonlyMap<string, string>>;
}

export const DIRECTORIO_DE_PERSONAS = Symbol('DirectorioDePersonas');
