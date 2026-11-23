import { Nit } from '../../../../../compartido/dominio/index.js';

// Valores fijos del anexo técnico 1.9 que comparten varias secciones del XML.

/** Espacios de nombres de la raíz Invoice. */
export const ESPACIOS_DE_NOMBRES = {
  xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  'xmlns:sts': 'dian:gov:co:facturaelectronica:Structures-2-1',
} as const;

/** Atributos de agencia que acompañan a los identificadores administrados por la DIAN. */
export const AGENCIA_DIAN = {
  schemeAgencyID: '195',
  schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
} as const;

/** La DIAN es quien autoriza los documentos (AuthorizationProvider). */
export const NIT_DIAN = Nit.de('800197268');

/** ProfileExecutionID y schemeID del CUFE según el ambiente. */
export const CODIGO_DE_AMBIENTE = {
  produccion: '1',
  habilitacion: '2',
} as const;

/** Página de consulta del documento que va en el código QR. */
export const URL_DE_CONSULTA = {
  habilitacion: 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr',
  produccion: 'https://catalogo-vpfe.dian.gov.co/document/searchqr',
} as const;

export const PESOS = { currencyID: 'COP' } as const;
