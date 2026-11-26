/**
 * Texto que va a la factura (y al XML de la DIAN): en forma NFC, sin caracteres de formato (bidi como U+202E,
 * ancho cero), surrogates sueltos ni «no caracteres» (U+FFFE, U+FFFF…, prohibidos en XML), con los de control
 * (C0 y C1) cambiados por un espacio y sin espacios de más. No se ven, pero cambian cómo se lee un nombre o
 * rompen el XML (hallazgos H2, H4 y N2 de la prueba de ataque de HU-05.01). Lo usan clientes y empresas.
 */
export function textoLimpio(texto: string): string {
  return texto
    .replace(/[\p{Cs}\p{Cf}\p{Noncharacter_Code_Point}]/gu, '')
    .normalize('NFC')
    .replace(/[\p{Cc}\u2028\u2029]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
