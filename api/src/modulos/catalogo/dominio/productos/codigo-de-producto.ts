import { ErrorDominio } from '../../../../compartido/dominio/index.js';

const CODIGO = /^[A-Z0-9._-]{1,40}$/;

/**
 * Código interno o de barras del producto, opcional y único en la empresa. Letras A-Z (en mayúsculas), dígitos,
 * punto, guion y guion bajo: va al XML de la DIAN (StandardItemIdentification) y no lleva espacios ni símbolos.
 */
export function codigoDeProducto(texto: string | null): string | null {
  if (texto === null) return null;
  const codigo = texto.trim().replace(/[a-z]/g, (letra) => letra.toUpperCase());
  if (codigo.length === 0) return null;
  if (!CODIGO.test(codigo)) {
    throw new ErrorDominio('producto.codigo-invalido', 'El código lleva de 1 a 40 letras, números, puntos o guiones');
  }
  return codigo;
}
