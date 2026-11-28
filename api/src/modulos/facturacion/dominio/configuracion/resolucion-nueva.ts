import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { ClaseDeDocumento } from '../documentos/clase-de-documento.js';
import { ResolucionDeNumeracion } from '../entidades/resolucion-de-numeracion.js';
import { claveTecnicaValida } from './secretos-dian.js';

export interface ResolucionEscrita {
  readonly clase: ClaseDeDocumento;
  readonly numero: string;
  readonly prefijo: string;
  readonly desde: number;
  readonly hasta: number;
  readonly vigenteDesde: string;
  readonly vigenteHasta: string;
  /** El primer número que usará CONTA; por omisión, el primero del rango (si otro sistema ya usó parte del rango). */
  readonly primerNumero: number | null;
  /** Clave técnica del rango (solo factura): entra al CUFE. Sin ella vale la pública del rango de habilitación. */
  readonly claveTecnica: string | null;
}

export interface ResolucionNueva {
  readonly resolucion: ResolucionDeNumeracion;
  readonly primerNumero: number;
  readonly claveTecnica: string | null;
}

/**
 * HU-07.04: una resolución que el dueño agrega. Nunca se edita: si la DIAN le da otro rango, agrega otra. Las reglas
 * de rango y vigencia son las de ResolucionDeNumeracion; aquí se suman el prefijo (hasta 4 letras mayúsculas o
 * dígitos), el primer número dentro del rango y la clave técnica, que solo tiene la factura.
 */
export function resolucionNueva(r: ResolucionEscrita): ResolucionNueva {
  if (!/^[A-Z0-9]{0,4}$/.test(r.prefijo)) {
    throw new ErrorDominio('resolucion.prefijo-invalido', 'El prefijo tiene hasta 4 letras mayúsculas o números');
  }
  const resolucion = ResolucionDeNumeracion.crear({ ...r });
  const primerNumero = r.primerNumero ?? r.desde;
  if (!Number.isSafeInteger(primerNumero) || primerNumero < r.desde || primerNumero > r.hasta) {
    throw new ErrorDominio('resolucion.primer-numero-invalido', 'El primer número va dentro del rango autorizado');
  }
  if (r.claveTecnica !== null && r.clase !== 'factura') {
    throw new ErrorDominio('resolucion.clave-tecnica-sobra', 'El tiquete POS no lleva clave técnica');
  }
  if (r.claveTecnica !== null && !claveTecnicaValida(r.claveTecnica)) {
    throw new ErrorDominio('resolucion.clave-tecnica-invalida', 'Revisa la clave técnica: son letras, números y guiones');
  }
  return { resolucion, primerNumero, claveTecnica: r.claveTecnica };
}

/** Todo lo que el dueño pidió, en un orden fijo: dos pedidos con el mismo contenido dan el mismo texto. */
export function contenidoDeLaResolucion(n: ResolucionNueva): string {
  const r = n.resolucion;
  return JSON.stringify([r.clase, r.numero, r.prefijo, r.desde, r.hasta, r.vigenteDesde, r.vigenteHasta, n.primerNumero, n.claveTecnica]);
}
