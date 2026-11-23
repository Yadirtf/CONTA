import type { ColaDeTrabajos } from './cola-de-trabajos.js';
import type { RegistroDeIntentos } from './registro-de-intentos.js';
import type { RepositorioDeEnvios } from './repositorio-de-envios.js';

/** Lo que la unidad de trabajo entrega a los casos de uso del envío, todo en una misma transacción. */
export interface RepositoriosDeEnvio {
  readonly envios: RepositorioDeEnvios;
  readonly intentos: RegistroDeIntentos;
  readonly cola: ColaDeTrabajos;
}
