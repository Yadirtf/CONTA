// Reglas de tiempo y de intentos del acceso con código (HU-04.01, ADR-0010). Viven en un solo lugar
// para que el dominio, la API y las pruebas digan lo mismo.

const MINUTO = 60_000;

export const POLITICA_DE_ACCESO = {
  /** Dígitos del código. */
  largoDelCodigo: 6,
  /** El código vence a los 10 minutos (criterio de aceptación). */
  vigenciaDelCodigoMs: 10 * MINUTO,
  /** Tras 5 intentos fallidos el celular queda bloqueado (criterio de aceptación)… */
  fallosAntesDelBloqueo: 5,
  /** …durante 15 minutos. */
  duracionDelBloqueoMs: 15 * MINUTO,
  /** Espera mínima entre dos códigos al mismo celular. */
  esperaEntreCodigosMs: MINUTO,
  /** Códigos que un celular puede pedir por hora (contra el bombeo de mensajes). */
  codigosPorHora: 5,
  ventanaDeCodigosMs: 60 * MINUTO,
  /** Una sesión dura 30 días desde que se abre. */
  vigenciaDeLaSesionMs: 30 * 24 * 60 * MINUTO,
} as const;
