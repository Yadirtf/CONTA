import type { X509Certificate } from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import { DocumentoNoFirmable } from '../../../aplicacion/firma/errores-de-firma.js';
import type { IdentificadoresDeFirma } from './identificadores-de-firma.js';
import { ESPACIO_XMLDSIG } from './politica-de-firma.js';

// Antes de entregar el documento, lo vuelve a leer como lo haría un verificador: una sola firma, con
// las tres referencias esperadas, y que valide con el certificado firmante. Si algo no cuadra, no sale.

export function verificarFirmaPropia(xml: string, certificado: X509Certificate, ids: IdentificadoresDeFirma): void {
  const documento = new DOMParser().parseFromString(xml, 'text/xml');
  const firmas = documento.getElementsByTagNameNS(ESPACIO_XMLDSIG, 'Signature');
  if (firmas.length !== 1) throw new DocumentoNoFirmable('la salida no tiene exactamente una firma');

  const uris = Array.from(documento.getElementsByTagNameNS(ESPACIO_XMLDSIG, 'Reference')).map((r) =>
    r.getAttribute('URI'),
  );
  if (uris.join(' ') !== ['', `#${ids.keyInfo}`, `#${ids.propiedadesFirmadas}`].join(' ')) {
    throw new DocumentoNoFirmable('las referencias de la firma no son las esperadas');
  }

  const verificador = new SignedXml({
    publicCert: certificado.toString(),
    getCertFromKeyInfo: () => null,
  });
  verificador.loadSignature(firmas[0]!);
  let valida = false;
  try {
    valida = verificador.checkSignature(xml);
  } catch {
    valida = false;
  }
  if (!valida) throw new DocumentoNoFirmable('la firma calculada no se pudo verificar');
}
