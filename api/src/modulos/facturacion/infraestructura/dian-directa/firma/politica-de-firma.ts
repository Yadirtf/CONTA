// Política de firma de la DIAN v2 (anexo técnico 1.9, sección 10): XMLDSig enveloped con XAdES-EPES.
// Solo constantes: qué algoritmos y qué política declara cada firma.

export const ESPACIO_XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#';
export const ESPACIO_XADES = 'http://uri.etsi.org/01903/v1.3.2#';

export const ALGORITMO = {
  /** C14N 1.0 inclusivo, sin comentarios: el que pide el anexo. */
  canonicalizacion: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  firmaEnvuelta: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
  firma: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  resumen: 'http://www.w3.org/2001/04/xmlenc#sha256',
} as const;

/** Type de la referencia a xades:SignedProperties. */
export const TIPO_PROPIEDADES_FIRMADAS = 'http://uri.etsi.org/01903#SignedProperties';

export const POLITICA = {
  identificador: 'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf',
  descripcion: 'Política de firma para facturas electrónicas de la República de Colombia',
  /** SHA-256 en base64 del PDF de la política v2, como lo publican las facturas que la DIAN acepta. */
  resumenSha256: 'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=',
} as const;

/** Quien firma: el facturador («supplier») o un tercero que firma por él («third party»). */
export type RolDelFirmante = 'supplier' | 'third party';
