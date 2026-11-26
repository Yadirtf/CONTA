import type { IdUsuario } from '../../dominio/index.js';

export interface SecretoNuevo {
  /** Clave en base32 para la app autenticadora. Solo viaja en la respuesta de la inscripción. */
  readonly claro: string;
  /** Lo que se guarda: el secreto cifrado y atado a la persona. */
  readonly cifrado: string;
}

export interface CodigosDeRecuperacion {
  /** Se muestran una sola vez. */
  readonly claros: readonly string[];
  /** Lo que se guarda. */
  readonly huellas: readonly string[];
}

/**
 * Criptografía del segundo factor (HU-04.04, ADR-0013): el secreto TOTP va cifrado con una clave del entorno
 * y atado al id de la persona; los códigos de recuperación, como HMAC. Las comparaciones toman tiempo constante.
 * Si falta la clave, cada operación falla con segundo-factor.sin-configurar.
 */
export interface SecretosDeSegundoFactor {
  nuevoSecreto(usuarioId: IdUsuario): SecretoNuevo;
  /** Paso de 30 s (con uno de margen a cada lado) con el que coincide el código, o null. */
  pasoQueCoincide(usuarioId: IdUsuario, secretoCifrado: string, codigo: string, ahora: Date): number | null;
  nuevosCodigosDeRecuperacion(): CodigosDeRecuperacion;
  /** Posición del código de recuperación entre las huellas, o null. */
  recuperacionQueCoincide(codigo: string, huellas: readonly string[]): number | null;
}

export const SECRETOS_DE_SEGUNDO_FACTOR = Symbol('SecretosDeSegundoFactor');
