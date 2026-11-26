import type { IdUsuario } from '../../../compartido/dominio/index.js';
import type { Celular } from './celular.js';

export { IdUsuario } from '../../../compartido/dominio/index.js';

/** Persona que entra a CONTA. Se registra sola la primera vez que verifica su celular. */
export interface Usuario {
  readonly id: IdUsuario;
  readonly celular: Celular;
  readonly creadoEn: Date;
}
