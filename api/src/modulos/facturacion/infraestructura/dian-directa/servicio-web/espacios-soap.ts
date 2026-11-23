// Espacios de nombres y valores fijos del servicio web de la DIAN (WcfDianCustomerServices, SOAP 1.2).

export const NS = {
  soap: 'http://www.w3.org/2003/05/soap-envelope',
  wsa: 'http://www.w3.org/2005/08/addressing',
  wcf: 'http://wcf.dian.colombia',
  wsse: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
  wsu: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
} as const;

export const ENDPOINT = {
  habilitacion: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
  produccion: 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc',
} as const;

/** wsa:Action y parámetro action del Content-Type: prefijo + nombre de la operación. */
export const PREFIJO_DE_ACCION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/';

export const TOKEN_X509 = {
  valueType: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3',
  encodingType: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary',
} as const;

export const ALGORITMO_WS = {
  canonicalizacion: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  firma: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  resumen: 'http://www.w3.org/2001/04/xmlenc#sha256',
  /** Prefijos que el servidor de la DIAN incluye al recalcular la firma (InclusiveNamespaces). */
  prefijosIncluidos: ['wsa', 'soap', 'wcf'],
} as const;

/** Vigencia del wsu:Timestamp. */
export const VIGENCIA_DEL_MENSAJE_MS = 5 * 60 * 1000;
