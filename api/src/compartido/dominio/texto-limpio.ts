/**
 * Texto que va a la factura (y al XML de la DIAN): en forma NFC, sin caracteres de formato (bidi como U+202E,
 * ancho cero), surrogates sueltos ni «no caracteres» (U+FFFE, U+FFFF…, prohibidos en XML), con los de control
 * (C0 y C1) cambiados por un espacio y sin espacios de más. No se ven, pero cambian cómo se lee un nombre o
 * rompen el XML (hallazgos H2, H4 y N2 de la prueba de ataque de HU-05.01). Lo usan clientes, empresas y productos.
 *
 * Tampoco deja lo que no se ve aunque Unicode lo cuente como letra o símbolo (hallazgo N2 de HU-05.02): los
 * ignorables por defecto (rellenos Hangul U+3164 y U+FFA0, selectores de variación, U+034F…), el braille vacío
 * U+2800, el uso privado y lo que no está asignado. Y corta las marcas combinantes seguidas en 4: alcanzan para
 * el vietnamita o el devanagari y frenan los textos «zalgo» que tapan las líneas de al lado.
 */
export function textoLimpio(texto: string): string {
  return texto
    .replace(/[\p{Cs}\p{Cf}\p{Co}\p{Cn}\p{Noncharacter_Code_Point}\p{Default_Ignorable_Code_Point}\u2800]/gu, '')
    .normalize('NFC')
    .replace(/(\p{M}{4})\p{M}+/gu, '$1')
    .replace(/[\p{Cc}\u2028\u2029]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
