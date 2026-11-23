import type { CertificadoDeFirma } from '../firma/certificado-de-firma.js';
import type { FirmadorDeDocumentos } from '../puertos/firmador-de-documentos.js';
import type { DocumentoElectronico } from '../puertos/generador-de-documento-electronico.js';

/**
 * HU-02.02: firma el XML que generó GenerarXmlFactura. El CUFE no cambia con la firma.
 * El envío a la DIAN (HU-02.03) es el paso siguiente.
 */
export class FirmarDocumentoElectronico {
  constructor(private readonly firmador: FirmadorDeDocumentos) {}

  ejecutar(documento: DocumentoElectronico, certificado: CertificadoDeFirma): DocumentoElectronico {
    return {
      xml: this.firmador.firmar(documento.xml, certificado),
      cufe: documento.cufe,
    };
  }
}
