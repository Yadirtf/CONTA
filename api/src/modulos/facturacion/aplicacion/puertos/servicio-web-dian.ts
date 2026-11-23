import type { RespuestaDeLaDian } from '../../dominio/index.js';
import type { CertificadoDeFirma } from '../firma/certificado-de-firma.js';

/** Datos para firmar el mensaje y entrar al set de pruebas. Los entrega ProveedorDeAccesoDian. */
export interface AccesoDian {
  readonly certificado: CertificadoDeFirma;
  /** Identificador del set de pruebas de habilitación (reservado: nunca va a logs ni errores). */
  readonly testSetId: string;
}

/** Documento firmado y los datos con que se arma el nombre del archivo (anexo 9.2). */
export interface DocumentoParaEnviar {
  readonly xmlFirmado: string;
  readonly nitEmisor: string;
  readonly anio: number;
  readonly consecutivo: number;
}

/** Acuse de recibo: la DIAN tomó el ZIP para validarlo (ZipKey), o lo rechazó de entrada. */
export type AcuseDeRecibo =
  | { readonly tipo: 'recibido'; readonly zipKey: string }
  | { readonly tipo: 'rechazado'; readonly respuesta: RespuestaDeLaDian };

/**
 * Servicio web de recepción de la DIAN (habilitación). Lanza FallaDeComunicacionDian cuando no hay una
 * respuesta utilizable (red, tiempo agotado, error del servidor); cualquier respuesta de la DIAN se devuelve.
 */
export interface ServicioWebDian {
  enviarSetDePruebas(documento: DocumentoParaEnviar, acceso: AccesoDian): Promise<AcuseDeRecibo>;
  consultarValidacion(zipKey: string, acceso: AccesoDian): Promise<RespuestaDeLaDian>;
}

export const SERVICIO_WEB_DIAN = Symbol('ServicioWebDian');
