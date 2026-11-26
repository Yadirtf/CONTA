// Reglas de tiempo y de intentos del segundo factor (HU-04.04, ADR-0013). Viven en un solo lugar para que el
// dominio, la API y las pruebas digan lo mismo.

const MINUTO = 60_000;

export const POLITICA_DE_SEGUNDO_FACTOR = {
  /** Dígitos del código de la app autenticadora (RFC 6238). */
  largoDelCodigo: 6,
  /** Una verificación vale una jornada en esa sesión; después se vuelve a pedir. */
  vigenciaDeLaVerificacionMs: 12 * 60 * MINUTO,
  /** Para cambiar de app autenticadora hay que haber verificado hace poco. */
  verificacionRecienteMs: 10 * MINUTO,
  /** Una inscripción sin confirmar caduca: el secreto mostrado deja de servir. */
  vigenciaDeLaInscripcionMs: 15 * MINUTO,
  /** Tras 5 intentos fallidos el segundo factor queda bloqueado… */
  fallosAntesDelBloqueo: 5,
  /** …durante 15 minutos. */
  duracionDelBloqueoMs: 15 * MINUTO,
  /** Códigos de recuperación que se entregan al inscribir; cada uno sirve una sola vez. */
  codigosDeRecuperacion: 10,
} as const;
