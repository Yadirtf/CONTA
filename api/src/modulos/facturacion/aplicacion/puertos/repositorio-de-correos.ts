import type { IdEmpresa } from '../../../../compartido/dominio/index.js';
import type { CorreoDeFactura, DatosDelCorreo } from '../../dominio/index.js';

/** Un intento de enviar el correo de una venta, tal como ocurrió. Solo se agregan. */
export interface IntentoDeCorreo {
  readonly ventaId: string;
  readonly numero: number;
  readonly resultado: 'enviado' | 'falla-pasajera' | 'falla-permanente';
  /** Código de la falla o «ok»: nunca el mensaje del proveedor ni la dirección. */
  readonly detalle: string;
  readonly duracionMs: number;
  readonly ocurridoEn: Date;
}

/** Correos de factura de la empresa de la transacción (RLS). No se borran. */
export interface RepositorioDeCorreos {
  buscar(ventaId: string): Promise<CorreoDeFactura | null>;
  /** Lo deja pedido una sola vez por venta: repetirlo no hace nada. */
  solicitar(correo: CorreoDeFactura): Promise<void>;
  /**
   * Guarda el nuevo estado solo si sigue como `leido` (mismos intentos y misma última falla): false si otro
   * procesador lo cambió antes.
   */
  actualizar(correo: CorreoDeFactura, leido: DatosDelCorreo): Promise<boolean>;
  registrarIntento(intento: IntentoDeCorreo): Promise<void>;
}

export interface CorreoPendiente {
  readonly empresaId: IdEmpresa;
  readonly ventaId: string;
}

/** Los correos que ya toca enviar, de todas las empresas. Solo ids: tomar cada uno pasa en su empresa. */
export interface FuenteDeCorreosPendientes {
  tomarVencidos(limite: number): Promise<CorreoPendiente[]>;
}

export const FUENTE_DE_CORREOS_PENDIENTES = Symbol('FuenteDeCorreosPendientes');
