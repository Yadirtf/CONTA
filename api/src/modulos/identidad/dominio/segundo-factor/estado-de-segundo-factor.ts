import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { ErrorDeSegundoFactor } from './error-de-segundo-factor.js';

// Tipos del agregado SegundoFactor (HU-04.04): su estado guardado y lo que devuelven sus reglas.

/** App autenticadora mostrada a la persona y aún sin confirmar con un primer código. */
export interface InscripcionPendiente {
  readonly secretoCifrado: string;
  readonly venceEn: Date;
}

/** Estado guardado del segundo factor de una persona. Se reconstruye desde la base con `SegundoFactor.desde`. */
export interface EstadoDeSegundoFactor {
  readonly usuarioId: IdUsuario;
  /** Secreto TOTP confirmado, cifrado: el dominio nunca lo ve en claro. */
  readonly secretoCifrado: string | null;
  readonly confirmadoEn: Date | null;
  readonly pendiente: InscripcionPendiente | null;
  /** Último paso de 30 s aceptado: un código ya usado no vuelve a servir. */
  readonly ultimoPaso: number | null;
  readonly fallos: number;
  readonly bloqueadoHasta: Date | null;
  /** Huellas de los códigos de recuperación que aún no se usan. */
  readonly huellasDeRecuperacion: readonly string[];
}

/** Paso de tiempo con el que coincide el código escrito para ese secreto, o null. Lo calcula la infraestructura. */
export type PasoQueCoincide = (secretoCifrado: string) => number | null;
/** Posición del código de recuperación escrito entre esas huellas, o null. */
export type RecuperacionQueCoincide = (huellas: readonly string[]) => number | null;

export type ViaDeVerificacion = 'app' | 'recuperacion';

export type ResultadoDeSegundoFactor<T> =
  | ({ readonly acerto: true } & T)
  | { readonly acerto: false; readonly error: ErrorDeSegundoFactor };
