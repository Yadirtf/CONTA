import { ErrorDominio, textoLimpio } from '../../../../compartido/dominio/index.js';

/** La descripción de una línea de la factura tiene hasta 300 caracteres (LineaDeFactura). */
const LARGO_MAXIMO = 300;

/** Nombre del producto como va en la factura: limpio de caracteres invisibles o de control (textoLimpio). */
export function nombreDeProducto(texto: string): string {
  const nombre = textoLimpio(texto);
  if (nombre.length === 0 || nombre.length > LARGO_MAXIMO) {
    throw new ErrorDominio('producto.nombre-invalido', `El nombre tiene de 1 a ${LARGO_MAXIMO} caracteres`);
  }
  return nombre;
}

/**
 * El nombre como se busca: minúsculas, sin tildes («Café» y «cafe» se encuentran) y solo letras, dígitos y un
 * espacio entre palabras. Sale del dominio y se guarda en su columna: no hace falta la extensión unaccent.
 * Como no deja % ni _, buscar con LIKE nunca lleva comodines escritos por la persona.
 */
export function nombreParaBuscar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
