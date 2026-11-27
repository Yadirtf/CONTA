import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/**
 * Qué documento electrónico sale de una venta (HU-06.02). Cada clase trae sus reglas: con qué código único se
 * identifica ante la DIAN y si tiene tope. Lo que cambia en el XML (ProfileID, InvoiceTypeCode, extensiones) vive en
 * la infraestructura DIAN; aquí solo lo que el negocio decide.
 *
 * - `factura`: factura electrónica de venta (anexo técnico 1.9). Código único CUFE, con la clave técnica del rango.
 * - `pos`: documento equivalente electrónico tiquete de máquina registradora con sistema P.O.S. (anexo del documento
 *   equivalente v1.0, Resolución 000165 de 2023). Código único CUDE, con el PIN del software. Tope de 5 UVT.
 */
export const CLASES_DE_DOCUMENTO = ['factura', 'pos'] as const;
export type ClaseDeDocumento = (typeof CLASES_DE_DOCUMENTO)[number];

/** CUFE para la factura; CUDE para el documento equivalente. Cambia la llave con que se calcula y su nombre. */
export type CodigoUnico = 'cufe' | 'cude';

export function claseDeDocumento(valor: unknown): ClaseDeDocumento {
  if (!(CLASES_DE_DOCUMENTO as readonly unknown[]).includes(valor)) {
    throw new ErrorDominio('documento.clase-invalida', 'El documento es factura o pos');
  }
  return valor as ClaseDeDocumento;
}

export function codigoUnicoDe(clase: ClaseDeDocumento): CodigoUnico {
  return clase === 'pos' ? 'cude' : 'cufe';
}

/** El nombre que exige la norma para cada documento: va en el comprobante y en el correo. */
export const NOMBRE_DEL_DOCUMENTO: Readonly<Record<ClaseDeDocumento, string>> = {
  factura: 'Factura electrónica de venta',
  pos: 'Documento equivalente electrónico tiquete de máquina registradora con sistema P.O.S.',
};

/** El nombre corto, con palabras del mostrador, para la app. */
export const NOMBRE_CORTO_DEL_DOCUMENTO: Readonly<Record<ClaseDeDocumento, string>> = {
  factura: 'Factura electrónica',
  pos: 'Tiquete POS electrónico',
};
