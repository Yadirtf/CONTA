import { SignedXml } from 'xml-crypto';
import type { IdentificadoresDeFirma } from './identificadores-de-firma.js';
import type { MaterialDeFirma } from './material-de-firma.js';
import { ALGORITMO, TIPO_PROPIEDADES_FIRMADAS } from './politica-de-firma.js';
import { UBICACION_DE_LA_FIRMA } from './documento-por-firmar.js';

// Calcula la ds:Signature con xml-crypto (C14N inclusivo real sobre el árbol) y la inserta en la segunda
// UBLExtension. Tres referencias, en el orden del anexo 10.3: el documento entero (URI=""), el KeyInfo
// y las propiedades firmadas XAdES. Firmar el documento entero evita los ataques de envoltura (wrapping).

export function firmarXmlDsig(
  xml: string,
  material: MaterialDeFirma,
  ids: IdentificadoresDeFirma,
  propiedadesXades: string,
): string {
  const firma = new SignedXml({
    privateKey: material.llave,
    signatureAlgorithm: ALGORITMO.firma,
    canonicalizationAlgorithm: ALGORITMO.canonicalizacion,
    keyInfoAttributes: { Id: ids.keyInfo },
    getKeyInfoContent: () => datosX509(material),
    objects: [{ content: propiedadesXades, attributes: { Id: ids.objeto } }],
  });
  firma.addReference({
    xpath: '/*',
    isEmptyUri: true,
    id: ids.referenciaAlDocumento,
    transforms: [ALGORITMO.firmaEnvuelta],
    digestAlgorithm: ALGORITMO.resumen,
  });
  firma.addReference({
    xpath: `//*[@Id='${ids.keyInfo}']`,
    transforms: [ALGORITMO.canonicalizacion],
    digestAlgorithm: ALGORITMO.resumen,
  });
  firma.addReference({
    xpath: `//*[@Id='${ids.propiedadesFirmadas}']`,
    type: TIPO_PROPIEDADES_FIRMADAS,
    transforms: [ALGORITMO.canonicalizacion],
    digestAlgorithm: ALGORITMO.resumen,
  });
  firma.computeSignature(xml, {
    prefix: 'ds',
    attrs: { Id: ids.firma },
    location: { reference: UBICACION_DE_LA_FIRMA, action: 'append' },
  });
  return firma.getSignedXml();
}

/** ds:X509Data con el certificado firmante primero y luego la cadena que traía el .p12. */
function datosX509({ certificado, cadena }: MaterialDeFirma): string {
  return `<ds:X509Data>${[certificado, ...cadena]
    .map((c) => `<ds:X509Certificate>${c.raw.toString('base64')}</ds:X509Certificate>`)
    .join('')}</ds:X509Data>`;
}
