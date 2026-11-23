import type { KeyObject } from 'node:crypto';
import { SignedXml } from 'xml-crypto';
import { ALGORITMO_WS, NS, TOKEN_X509 } from './espacios-soap.js';
import { ID_DEL_DESTINO, ID_DEL_TOKEN } from './sobre-soap.js';

// Firma WS-Security del sobre: solo wsa:To, con C14N exclusivo y los prefijos wsa, soap y wcf incluidos,
// RSA-SHA256 y KeyInfo que apunta al BinarySecurityToken. Es lo que el servidor de la DIAN verifica;
// la política del WSDL (huella del certificado) no funciona contra el servidor real.

const UBICACION = `//*[local-name()='BinarySecurityToken' and namespace-uri()='${NS.wsse}']`;

export function firmarSobre(sobre: string, llave: KeyObject): string {
  const firma = new SignedXml({
    idMode: 'wssecurity',
    privateKey: llave,
    signatureAlgorithm: ALGORITMO_WS.firma,
    canonicalizationAlgorithm: ALGORITMO_WS.canonicalizacion,
    inclusiveNamespacesPrefixList: [...ALGORITMO_WS.prefijosIncluidos],
    getKeyInfoContent: () =>
      `<wsse:SecurityTokenReference xmlns:wsse="${NS.wsse}"><wsse:Reference URI="#${ID_DEL_TOKEN}" ValueType="${TOKEN_X509.valueType}"/></wsse:SecurityTokenReference>`,
  });
  firma.addReference({
    xpath: `//*[local-name()='To' and namespace-uri()='${NS.wsa}']`,
    transforms: [ALGORITMO_WS.canonicalizacion],
    inclusiveNamespacesPrefixList: [...ALGORITMO_WS.prefijosIncluidos],
    digestAlgorithm: ALGORITMO_WS.resumen,
  });
  firma.computeSignature(sobre, { prefix: 'ds', location: { reference: UBICACION, action: 'after' } });
  const firmado = firma.getSignedXml();
  if (!firmado.includes(`URI="#${ID_DEL_DESTINO}"`)) throw new Error('La firma WS-Security no referencia wsa:To');
  return firmado;
}
