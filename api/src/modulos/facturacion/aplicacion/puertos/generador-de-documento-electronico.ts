import type { Factura } from '../../dominio/index.js';

/** Quién hizo el software: extensión FabricanteSoftware del documento equivalente (anexo DEE 8.1). */
export interface FabricanteDelSoftware {
  /** NombreApellido */
  readonly nombre: string;
  /** RazonSocial: la DIAN la exige en el tiquete POS. */
  readonly razonSocial: string;
  /** NombreSoftware */
  readonly nombreDelSoftware: string;
}

/** Datos del ambiente y del software que la DIAN asignó al facturador. */
export interface ConfiguracionDian {
  /** «habilitacion» (ProfileExecutionID 2) o «produccion» (1). */
  readonly ambiente: 'habilitacion' | 'produccion';
  /** Clave técnica del rango de numeración de la factura: reservada, solo entra al CUFE. El tiquete POS no la usa. */
  readonly claveTecnica: string;
  /** Identificador del software en el catálogo de la DIAN. */
  readonly idSoftware: string;
  /** PIN del software: reservado, solo entra al SoftwareSecurityCode. */
  readonly pinSoftware: string;
  /** NIT del proveedor del software (sin dígito de verificación). Si es software propio, el del facturador. */
  readonly nitProveedorSoftware: string;
  /** Solo para el tiquete POS; null en la factura. */
  readonly fabricante: FabricanteDelSoftware | null;
}

/** Resultado de generar el documento: el XML sin firmar y su código único (CUFE de la factura, CUDE del POS). */
export interface DocumentoElectronico {
  readonly xml: string;
  readonly cufe: string;
}

/**
 * Arma el XML del documento electrónico (UBL 2.1): la factura del anexo técnico 1.9 o el tiquete POS del anexo del
 * documento equivalente, según la clase de la factura. Lo implementa la infraestructura DIAN.
 */
export interface GeneradorDeDocumentoElectronico {
  generar(factura: Factura, configuracion: ConfiguracionDian): DocumentoElectronico;
}

export const GENERADOR_DE_DOCUMENTO_ELECTRONICO = Symbol('GeneradorDeDocumentoElectronico');
