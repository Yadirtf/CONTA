import type { AtributoDeNombre } from './material-de-firma.js';

// X509IssuerName de xades:IssuerSerial, como cadena RFC 4514: los atributos en orden inverso al del
// certificado, separados por comas, con los caracteres especiales escapados.

export function nombreDistinguido(atributos: readonly AtributoDeNombre[]): string {
  return [...atributos]
    .reverse()
    .map((a) => `${a.tipo}=${escapar(a.valor)}`)
    .join(',');
}

function escapar(valor: string): string {
  return valor
    .replace(/[\\"+,;<>]/g, (c) => `\\${c}`)
    .replace(/^[#\s]/, (c) => `\\${c}`)
    .replace(/\s$/, (c) => `\\${c}`);
}
