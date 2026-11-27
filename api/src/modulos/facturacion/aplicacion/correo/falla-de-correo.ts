/**
 * El correo no salió. `codigo` es corto y sin datos (por ejemplo «correo.http-503»), porque se guarda; `permanente`
 * dice si reintentar no sirve (el proveedor rechazó la dirección).
 */
export class FallaDeCorreo extends Error {
  constructor(
    readonly codigo: string,
    readonly permanente: boolean,
  ) {
    super(`El correo no salió: ${codigo}`);
    this.name = 'FallaDeCorreo';
  }
}

/** Código guardable de cualquier error: nunca su mensaje, que podría traer la dirección o la llave. */
export function codigoDeFallaDeCorreo(error: unknown): { codigo: string; permanente: boolean } {
  if (error instanceof FallaDeCorreo) return { codigo: error.codigo, permanente: error.permanente };
  return { codigo: 'correo.error-interno', permanente: false };
}
