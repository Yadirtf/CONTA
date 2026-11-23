import type { Factura } from '../../dominio/index.js';

/** Datos del ambiente y del software que la DIAN asignó al facturador. */
export interface ConfiguracionDian {
  /** «habilitacion» (ProfileExecutionID 2) o «produccion» (1). */
  readonly ambiente: 'habilitacion' | 'produccion';
  /** Clave técnica del rango de numeración: reservada, solo entra al CUFE. */
  readonly claveTecnica: string;
  /** Identificador del software en el catálogo de la DIAN. */
  readonly idSoftware: string;
  /** PIN del software: reservado, solo entra al SoftwareSecurityCode. */
  readonly pinSoftware: string;
  /** NIT del proveedor del software (sin dígito de verificación). Si es software propio, el del facturador. */
  readonly nitProveedorSoftware: string;
}

/** Resultado de generar el documento: el XML sin firmar y su CUFE. */
export interface DocumentoElectronico {
  readonly xml: string;
  readonly cufe: string;
}

/** Arma el XML del documento electrónico (UBL 2.1 del anexo técnico 1.9). Lo implementa la infraestructura DIAN. */
export interface GeneradorDeDocumentoElectronico {
  generar(factura: Factura, configuracion: ConfiguracionDian): DocumentoElectronico;
}

export const GENERADOR_DE_DOCUMENTO_ELECTRONICO = Symbol('GeneradorDeDocumentoElectronico');
