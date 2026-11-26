import { ErrorDominio, textoLimpio } from '../../../../compartido/dominio/index.js';

/** La descripción de una línea de la factura tiene hasta 300 caracteres (LineaDeFactura). */
const LARGO_MAXIMO = 300;

/**
 * Nombre del producto como va en la factura: limpio de caracteres invisibles o de control (textoLimpio) y con al
 * menos una letra o un número que se vea y se pueda buscar. Así no entran nombres hechos solo de marcas
 * combinantes, rellenos Hangul o braille vacío, que salían en blanco en la lista del cajero (hallazgo H2).
 */
export function nombreDeProducto(texto: string): string {
  const nombre = textoLimpio(texto);
  if (nombre.length === 0 || nombre.length > LARGO_MAXIMO) {
    throw new ErrorDominio('producto.nombre-invalido', `El nombre tiene de 1 a ${LARGO_MAXIMO} caracteres`);
  }
  if (nombreParaBuscar(nombre).length === 0) {
    throw new ErrorDominio('producto.nombre-invalido', 'El nombre lleva al menos una letra o un número');
  }
  return nombre;
}

/**
 * El nombre como se busca: minúsculas, sin tildes («Café» y «cafe» se encuentran) y solo letras y dígitos de
 * cualquier alfabeto («Пиво», «日本酒», «김치»; hallazgo N3), con un espacio entre palabras. Sale del dominio y se
 * guarda en su columna: no hace falta la extensión unaccent. Como no deja % ni _ ni barra invertida, buscar con LIKE nunca
 * lleva comodines escritos por la persona. Minúsculas antes de separar las tildes: «İ» queda «i».
 */
export function nombreParaBuscar(texto: string): string {
  return texto
    .replace(/\p{Default_Ignorable_Code_Point}/gu, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
