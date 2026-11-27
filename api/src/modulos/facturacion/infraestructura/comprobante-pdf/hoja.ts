// Medidas de la hoja del comprobante (carta, en puntos) y estilo de texto. Solo grises: el PDF no usa colores de
// marca, se imprime bien en blanco y negro y se lee en cualquier celular.
export const HOJA = { ancho: 612, alto: 792, margen: 40 } as const;
export const ANCHO_UTIL = HOJA.ancho - 2 * HOJA.margen;
export const FUENTE = 'Helvetica';
export const FUENTE_NEGRILLA = 'Helvetica-Bold';
export const TEXTO = '#111111';
export const TEXTO_SUAVE = '#555555';
export const LINEA = '#BBBBBB';

/**
 * Las fuentes estándar del PDF solo saben escribir Latin-1 (WinAnsi): español completo, con tildes y ñ. Cualquier
 * otro carácter (un emoji en el nombre de un producto) se cambia por «?» en vez de romper el dibujo.
 */
export function imprimible(texto: string): string {
  return texto.replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, '?');
}
