import type { Reloj } from '../../../../../compartido/aplicacion/index.js';
import type { CertificadoDeFirma } from '../../../aplicacion/firma/certificado-de-firma.js';
import { CertificadoNoUtilizable, DocumentoNoFirmable } from '../../../aplicacion/firma/errores-de-firma.js';
import type { FirmadorDeDocumentos } from '../../../aplicacion/puertos/firmador-de-documentos.js';
import { verificarFirmaPropia } from './autoverificacion.js';
import { documentoPorFirmar } from './documento-por-firmar.js';
import { firmarXmlDsig } from './firma-xmldsig.js';
import { nuevosIdentificadores } from './identificadores-de-firma.js';
import { leerPkcs12 } from './lector-pkcs12.js';
import type { RolDelFirmante } from './politica-de-firma.js';
import { propiedadesXades } from './propiedades-xades.js';
import { exigirCertificadoUtilizable } from './requisitos-del-certificado.js';

/**
 * Adaptador de firma XAdES-EPES para la DIAN (HU-02.02). Solo coordina los pasos; cada uno vive en su archivo.
 * El certificado se abre en memoria en cada llamada y no se guarda entre llamadas ni entre empresas.
 */
export class FirmadorXadesDian implements FirmadorDeDocumentos {
  constructor(
    private readonly reloj: Reloj,
    private readonly rol: RolDelFirmante = 'supplier',
  ) {}

  firmar(xml: string, certificado: CertificadoDeFirma): string {
    const momento = this.reloj.ahora();
    const material = certificado.usar(leerPkcs12);
    exigirCertificadoUtilizable(material, momento);

    const ids = nuevosIdentificadores();
    const porFirmar = documentoPorFirmar(xml);
    let firmado: string;
    try {
      firmado = firmarXmlDsig(porFirmar, material, ids, propiedadesXades(ids, material, momento, this.rol));
    } catch (error) {
      if (error instanceof CertificadoNoUtilizable || error instanceof DocumentoNoFirmable) throw error;
      throw new DocumentoNoFirmable('falló el cálculo de la firma');
    }
    verificarFirmaPropia(firmado, material.certificado, ids);
    return firmado;
  }
}
