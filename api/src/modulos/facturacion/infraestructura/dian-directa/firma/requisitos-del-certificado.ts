import { CertificadoNoUtilizable } from '../../../aplicacion/firma/errores-de-firma.js';
import type { MaterialDeFirma } from './material-de-firma.js';

const BITS_MINIMOS = 2048;

/**
 * Requisitos de la política de firma (anexo 10.2): llave RSA, certificado vigente en el momento de la firma
 * y Key Usage con firma digital y no repudio.
 */
export function exigirCertificadoUtilizable(material: MaterialDeFirma, momento: Date): void {
  const detalles = material.llave.asymmetricKeyDetails;
  if (material.llave.asymmetricKeyType !== 'rsa' || (detalles?.modulusLength ?? 0) < BITS_MINIMOS) {
    throw new CertificadoNoUtilizable('algoritmo');
  }
  const desde = new Date(material.certificado.validFrom).getTime();
  const hasta = new Date(material.certificado.validTo).getTime();
  if (!(momento.getTime() >= desde && momento.getTime() <= hasta)) {
    throw new CertificadoNoUtilizable('fuera-de-vigencia');
  }
  if (!material.usos?.firmaDigital || !material.usos.noRepudio) {
    throw new CertificadoNoUtilizable('sin-uso-de-firma');
  }
}
