/**
 * Deja un número de documento como se guarda y se busca: sin espacios, puntos ni comas, en mayúsculas.
 * «900.373.076-4» queda «900373076»: lo que va después del guion es el dígito de verificación, que se calcula.
 * No valida: Identificacion y TerminoDeBusqueda deciden si el resultado sirve.
 */
export function numeroDeDocumentoLimpio(texto: string): string {
  const [numero = ''] = texto.replace(/[\s.,]/g, '').split('-');
  return numero.toUpperCase();
}

/** El dígito escrito después del guion («900373076-4» → 4), o null si no hay o no es un dígito. */
export function digitoEscritoEn(texto: string): number | null {
  const partes = texto.replace(/[\s.,]/g, '').split('-');
  if (partes.length !== 2 || !/^\d$/.test(partes[1] ?? '')) return null;
  return Number(partes[1]);
}
