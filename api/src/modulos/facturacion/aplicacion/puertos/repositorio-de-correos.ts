import type { IdEmpresa } from '../../../../compartido/dominio/index.js';
import type { CorreoDeFactura } from '../../dominio/index.js';

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
  /** Guarda el nuevo estado solo si nadie lo cambió desde `intentosLeidos`. false si perdió la carrera. */
  actualizar(correo: CorreoDeFactura, intentosLeidos: number): Promise<boolean>;
  registrarIntento(intento: IntentoDeCorreo): Promise<void>;
}

export interface CorreoPendiente {
  readonly empresaId: IdEmpresa;
  readonly ventaId: string;
}

/** Toma, de todas las empresas, los correos que ya toca enviar y los reserva un rato para que nadie más los tome. */
export interface FuenteDeCorreosPendientes {
  tomarVencidos(limite: number): Promise<CorreoPendiente[]>;
}

export const FUENTE_DE_CORREOS_PENDIENTES = Symbol('FuenteDeCorreosPendientes');
