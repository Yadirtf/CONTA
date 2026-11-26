const SEPARADORES = /[\s.,]/g;

/**
 * Deja un número de documento como se guarda y se busca: sin espacios, puntos ni comas, con las letras a-z en
 * mayúsculas (solo ASCII: «ß» no se vuelve «SS»). «900.373.076-4» queda «900373076»: un único guion seguido de un
 * dígito es el dígito de verificación, que se calcula. Cualquier otro guion se deja, para que la validación lo
 * rechace en vez de cortar el número en silencio (hallazgo H3 de la prueba de ataque).
 */
export function numeroDeDocumentoLimpio(texto: string): string {
  const limpio = texto.replace(SEPARADORES, '').replace(/[a-z]/g, (letra) => letra.toUpperCase());
  const partes = limpio.split('-');
  return partes.length === 2 && /^\d$/.test(partes[1] ?? '') ? (partes[0] ?? '') : limpio;
}

/** El dígito escrito después del único guion («900373076-4» → 4), o null si no hay o no es un dígito. */
export function digitoEscritoEn(texto: string): number | null {
  const partes = texto.replace(SEPARADORES, '').split('-');
  if (partes.length !== 2 || !/^\d$/.test(partes[1] ?? '')) return null;
  return Number(partes[1]);
}
