import { Identificacion } from '../../../../compartido/dominio/index.js';
import type { Direccion } from './contacto.js';
import { SIN_RESPONSABILIDADES, type TipoDePersona } from './datos-tributarios.js';

/**
 * Comprador genérico de la DIAN para quien no pide factura a su nombre: cédula 222222222222, «Consumidor
 * final», sin responsabilidades (R-99-PN) y no responsable de IVA (ZZ). No se guarda en la base: es igual
 * para todas las empresas y nadie lo puede cambiar.
 */
export const CONSUMIDOR_FINAL = {
  identificacion: Identificacion.de('13', '222222222222'),
  nombre: 'Consumidor final',
  tipoDePersona: 'natural' as TipoDePersona,
  responsabilidadesFiscales: [SIN_RESPONSABILIDADES] as readonly string[],
  responsableDeIva: false,
  correo: null as string | null,
  direccion: null as Direccion | null,
} as const;

/** El número de consumidor final queda reservado, con cualquier tipo de documento y con ceros adelante. */
export function esConsumidorFinal(identificacion: Identificacion): boolean {
  return identificacion.numero.replace(/^0+/, '') === CONSUMIDOR_FINAL.identificacion.numero;
}
