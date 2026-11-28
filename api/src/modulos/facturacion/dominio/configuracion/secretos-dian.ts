/**
 * Formas de los datos reservados que da la DIAN (HU-07.04). Son las mismas que exige el generador del XML
 * (configuracion-exigida.ts): lo que se guarda siempre sirve para firmar.
 */
export function claveTecnicaValida(clave: string): boolean {
  return /^[\w-]{1,100}$/.test(clave);
}

/** PIN del software: letras y números, como lo pide el portal de habilitación. */
export function pinValido(pin: string): boolean {
  return /^[0-9A-Za-z]{4,40}$/.test(pin);
}

/** Lo único que se muestra de un PIN guardado: su último carácter. */
export function finalDelPin(pin: string): string {
  return pin.slice(-1);
}
