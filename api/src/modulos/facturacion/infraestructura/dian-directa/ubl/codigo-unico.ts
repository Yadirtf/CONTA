import type { ConfiguracionDian } from '../../../aplicacion/puertos/generador-de-documento-electronico.js';
import { codigoUnicoDe, type Factura } from '../../../dominio/index.js';
import { calcularCufe } from './cufe.js';
import { monto } from './montos.js';

/**
 * El código único del documento, con los mismos textos que quedan en el XML.
 * - Factura: CUFE (anexo técnico 1.9, 11.2), con la clave técnica del rango.
 * - Tiquete POS: CUDE (anexo del documento equivalente, 14.1.2): la misma cadena y el mismo SHA-384, pero con el PIN
 *   del software en lugar de la clave técnica.
 */
export function codigoUnicoDelDocumento(factura: Factura, configuracion: ConfiguracionDian, ambiente: '1' | '2'): string {
  const llave = codigoUnicoDe(factura.clase) === 'cude' ? configuracion.pinSoftware : configuracion.claveTecnica;
  return calcularCufe({
    numero: factura.numero.aTexto(),
    fecha: factura.emision.fecha,
    hora: factura.emision.hora,
    valorBruto: monto(factura.totalBruto),
    iva: monto(factura.totalIva),
    inc: '0.00',
    ica: '0.00',
    total: monto(factura.total),
    nitEmisor: factura.emisor.identificacion.numero,
    identificacionAdquirente: factura.adquirente.identificacion.numero,
    claveTecnica: llave,
    ambiente,
  });
}
