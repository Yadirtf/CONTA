import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/**
 * Cómo pagó el comprador, con palabras del mostrador, y su código de la DIAN (anexo técnico 1.9, tabla 13.3.4.4).
 * Nequi y Daviplata son transferencias. El fiado (crédito) llega con la cartera (EP-12): pide comprador y plazo.
 */
const CODIGOS_DIAN = {
  efectivo: '10',
  'tarjeta-debito': '49',
  'tarjeta-credito': '48',
  transferencia: '47',
} as const;

export type MedioDePago = keyof typeof CODIGOS_DIAN;

export const MEDIOS_DE_PAGO = Object.keys(CODIGOS_DIAN) as readonly MedioDePago[];

export function medioDePago(valor: unknown): MedioDePago {
  if (typeof valor !== 'string' || !(MEDIOS_DE_PAGO as readonly string[]).includes(valor)) {
    throw new ErrorDominio('venta.medio-de-pago-invalido', 'El medio de pago es efectivo, tarjeta débito, tarjeta crédito o transferencia');
  }
  return valor as MedioDePago;
}

export function codigoDianDe(medio: MedioDePago): string {
  return CODIGOS_DIAN[medio];
}
