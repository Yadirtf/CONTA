import type { IdEmpresa, IdUsuario } from '../../../compartido/dominio/index.js';

/**
 * Pertenencia de una persona a una empresa (HU-04.02). Es lo que le permite trabajar en ella: sin membresía,
 * la empresa no existe para esa persona. HU-04.03 le añade el rol y el modo.
 */
export interface Membresia {
  readonly empresaId: IdEmpresa;
  readonly usuarioId: IdUsuario;
  readonly creadaEn: Date;
}

export function nuevaMembresia(empresaId: IdEmpresa, usuarioId: IdUsuario, ahora: Date): Membresia {
  return { empresaId, usuarioId, creadaEn: ahora };
}
