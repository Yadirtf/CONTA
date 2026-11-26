import { ErrorDominio, textoLimpio } from '../../../../compartido/dominio/index.js';
import { esMunicipioDane } from './municipio-dane.js';

/** Dirección con el código DANE del municipio (5 dígitos; los 2 primeros son el departamento). */
export interface Direccion {
  readonly codigoMunicipio: string;
  readonly ciudad: string;
  readonly departamento: string;
  readonly linea: string;
}

// Solo ASCII imprimible y sin < > " ni espacios: el correo viaja a encabezados de correo y al XML.
const CORREO = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
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
  if (!esMunicipioDane(limpia.codigoMunicipio) || !textosValidos) {
    throw new ErrorDominio('cliente.direccion-invalida', 'La dirección lleva el código DANE del municipio, ciudad, departamento y dirección');
  }
  return limpia;
}
