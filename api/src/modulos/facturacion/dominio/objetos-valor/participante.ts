import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { Identificacion } from './identificacion.js';

/** Dirección con el código DANE del municipio (5 dígitos; los 2 primeros son el departamento). */
export interface Direccion {
  readonly codigoMunicipio: string;
  readonly ciudad: string;
  readonly departamento: string;
  readonly linea: string;
}

/** Emisor o adquirente de la factura. */
export interface Participante {
  readonly identificacion: Identificacion;
  readonly razonSocial: string;
  readonly tipoDePersona: 'juridica' | 'natural';
  /** Responsabilidades fiscales del RUT (casilla 53), por ejemplo «O-13» o «R-99-PN». */
  readonly responsabilidadesFiscales: readonly string[];
  /** Responsable de IVA (tributo 01) o no responsable (ZZ). */
  readonly responsableDeIva: boolean;
  readonly direccion: Direccion | null;
  readonly correo: string | null;
}

const RESPONSABILIDAD = /^(O-\d{2}|R-99-PN)$/;

export function participante(datos: Participante): Participante {
  const razonSocial = datos.razonSocial.trim();
  if (razonSocial.length === 0 || razonSocial.length > 450) {
    throw new ErrorDominio('factura.razon-social-invalida', 'La razón social tiene de 1 a 450 caracteres');
  }
  if (datos.responsabilidadesFiscales.length === 0 || !datos.responsabilidadesFiscales.every((r) => RESPONSABILIDAD.test(r))) {
    throw new ErrorDominio('factura.responsabilidad-invalida', 'Indique las responsabilidades fiscales del RUT (O-13, R-99-PN, ...)');
  }
  if (datos.direccion) {
    const { codigoMunicipio, ciudad, departamento, linea } = datos.direccion;
    if (!/^\d{5}$/.test(codigoMunicipio) || [ciudad, departamento, linea].some((t) => t.trim().length === 0)) {
      throw new ErrorDominio('factura.direccion-invalida', 'La dirección lleva el código DANE de 5 dígitos, ciudad, departamento y línea');
    }
  }
  if (datos.correo !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
    throw new ErrorDominio('factura.correo-invalido', 'El correo no es válido');
  }
  return { ...datos, razonSocial };
}
