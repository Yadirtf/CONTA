import type { CertificadoDeFirma } from '../firma/certificado-de-firma.js';

/**
 * Firma un documento electrónico ya generado con el certificado del facturador (XAdES-EPES, anexo técnico 1.9,
 * sección 10). Devuelve el XML firmado. Lanza CertificadoNoUtilizable o DocumentoNoFirmable, nunca un error
 * de la librería criptográfica. El certificado solo vive en memoria durante la llamada.
 */
export interface FirmadorDeDocumentos {
  firmar(xml: string, certificado: CertificadoDeFirma): string;
}

export const FIRMADOR_DE_DOCUMENTOS = Symbol('FirmadorDeDocumentos');
