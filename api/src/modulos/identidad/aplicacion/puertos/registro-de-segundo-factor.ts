import type { IdUsuario } from '../../dominio/index.js';

/** Lo que queda anotado de cada paso del segundo factor (HU-04.04). Nunca lleva códigos ni secretos. */
export type TipoDeEventoDeSegundoFactor =
  | 'inscripcion-iniciada'
  | 'inscrito'
  | 'reemplazado'
  | 'verificado'
  | 'verificado-con-recuperacion'
  | 'fallo'
  | 'bloqueado';

export interface EventoDeSegundoFactor {
  readonly id: string;
  readonly usuarioId: IdUsuario;
  readonly sesionId: string;
  readonly tipo: TipoDeEventoDeSegundoFactor;
  readonly ocurridoEn: Date;
}

/** Registro de solo inserción: sirve para auditar y detectar abusos (quién, qué sesión, cuándo, qué pasó). */
export interface RegistroDeSegundoFactor {
  anotar(evento: EventoDeSegundoFactor): Promise<void>;
}
