// Escritor de XML mínimo y determinista para los documentos de la DIAN. No indenta ni agrega espacios:
// lo que se escribe es exactamente lo que se firmará después (HU-02.02).

export interface NodoXml {
  readonly nombre: string;
  readonly atributos: Readonly<Record<string, string>>;
  readonly contenido: string | readonly NodoXml[];
}

type Hijo = NodoXml | null | undefined | false;

/** Elemento con texto: el('cbc:ID', 'SETP1') o el('cbc:TaxAmount', '19.00', { currencyID: 'COP' }). */
export function el(nombre: string, texto: string, atributos: Record<string, string> = {}): NodoXml {
  return { nombre, atributos, contenido: texto };
}

/** Elemento con hijos; los hijos null, undefined o false se omiten, para escribir opcionales en línea. */
export function grupo(nombre: string, hijos: readonly Hijo[], atributos: Record<string, string> = {}): NodoXml {
  return { nombre, atributos, contenido: hijos.filter((h): h is NodoXml => Boolean(h)) };
}

export function serializar(raiz: NodoXml): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${escribir(raiz)}`;
}

const NOMBRE = /^[A-Za-z_][\w.-]*(:[A-Za-z_][\w.-]*)?$/;
// Caracteres que XML 1.0 no admite (controles, sustitutos sueltos, U+FFFE y U+FFFF).
const NO_ADMITIDOS = /[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/u;

function escribir(nodo: NodoXml): string {
  exigirNombre(nodo.nombre);
  const atributos = Object.entries(nodo.atributos)
    .map(([nombre, valor]) => {
      exigirNombre(nombre);
      return ` ${nombre}="${escapar(valor).replaceAll('"', '&quot;')}"`;
    })
    .join('');
  const contenido = typeof nodo.contenido === 'string' ? escapar(nodo.contenido) : nodo.contenido.map(escribir).join('');
  return contenido === '' ? `<${nodo.nombre}${atributos}/>` : `<${nodo.nombre}${atributos}>${contenido}</${nodo.nombre}>`;
}

function exigirNombre(nombre: string): void {
  if (!NOMBRE.test(nombre)) throw new Error(`Nombre XML inválido: ${nombre}`);
}

function escapar(texto: string): string {
  if (NO_ADMITIDOS.test(texto)) throw new Error('El texto tiene caracteres que XML no admite');
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
