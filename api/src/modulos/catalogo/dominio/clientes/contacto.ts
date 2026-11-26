import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Dirección con el código DANE del municipio (5 dígitos; los 2 primeros son el departamento). */
export interface Direccion {
  readonly codigoMunicipio: string;
  readonly ciudad: string;
  readonly departamento: string;
  readonly linea: string;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LARGO_MAXIMO_DEL_CORREO = 254;
const LARGO_MAXIMO_DE_TEXTO = 200;

/** Correo para mandarle la factura, en minúsculas; null si no tiene. */
export function correoDe(correo: string | null): string | null {
  if (correo === null) return null;
  const limpio = correo.trim().toLowerCase();
  if (limpio.length > LARGO_MAXIMO_DEL_CORREO || !CORREO.test(limpio)) {
    throw new ErrorDominio('cliente.correo-invalido', 'El correo no es válido');
  }
  return limpio;
}

export function direccionDe(direccion: Direccion | null): Direccion | null {
  if (direccion === null) return null;
  const limpia = {
    codigoMunicipio: direccion.codigoMunicipio,
    ciudad: textoLimpio(direccion.ciudad),
    departamento: textoLimpio(direccion.departamento),
    linea: textoLimpio(direccion.linea),
  };
  const textosValidos = [limpia.ciudad, limpia.departamento, limpia.linea].every((t) => t.length > 0 && t.length <= LARGO_MAXIMO_DE_TEXTO);
  if (!/^\d{5}$/.test(limpia.codigoMunicipio) || !textosValidos) {
    throw new ErrorDominio('cliente.direccion-invalida', 'La dirección lleva el código DANE de 5 dígitos, ciudad, departamento y dirección');
  }
  return limpia;
}

/** Sin espacios de más ni caracteres de control (no se ven, pero llegarían al XML de la factura). */
export function textoLimpio(texto: string): string {
  // eslint-disable-next-line no-control-regex
  return texto.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}
