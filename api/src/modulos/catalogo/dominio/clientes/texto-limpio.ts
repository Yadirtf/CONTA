/**
 * Texto que va a la factura (y al XML de la DIAN): en forma NFC, sin caracteres de formato (bidi como U+202E,
 * ancho cero) ni surrogates sueltos, con los de control (C0 y C1) cambiados por un espacio y sin espacios de
 * más. No se ven, pero cambian cómo se lee un nombre o rompen el XML (hallazgos H2 y H4 de la prueba de ataque).
 */
export function textoLimpio(texto: string): string {
  return texto
    .replace(/[\p{Cs}\p{Cf}]/gu, '')
    .normalize('NFC')
    .replace(/[\p{Cc}\u2028\u2029]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
