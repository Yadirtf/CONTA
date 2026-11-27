import type { ClaseDeDocumento, EstadoDelEnvio, Participante, Venta } from '../../dominio/index.js';
import type { RespuestaDeLaDian } from '../../dominio/index.js';

/** Una venta guardada y la resolución con la que se numeró. */
export interface VentaGuardada {
  readonly venta: Venta;
  readonly resolucionId: string;
}

/** El envío a la DIAN del documento de una venta, si ya se firmó y encoló. */
export interface EnvioDeLaVenta {
  readonly envioId: string;
  readonly estado: EstadoDelEnvio;
  readonly respuesta: RespuestaDeLaDian | null;
}

/** La factura de una venta tal como se envió: lo que el comprobante y el correo toman sin recalcular. */
export interface FacturaDeLaVenta {
  readonly estado: EstadoDelEnvio;
  readonly cufe: string;
  /** El texto del QR que quedó en el XML firmado. */
  readonly codigoQr: string;
  /** El emisor tal como quedó en el XML firmado: el comprobante no usa los datos fiscales de hoy. */
  readonly emisor: Participante;
  readonly xmlFirmado: string;
}

/** Una línea de «Mis ventas». */
export interface ResumenDeVenta {
  readonly id: string;
  readonly numero: string;
  /** Factura o tiquete POS (HU-06.02). */
  readonly clase: ClaseDeDocumento;
  readonly emitidaEn: Date;
  readonly comprador: string;
  readonly total: string;
  /** null si el documento todavía no se firmó ni encoló. */
  readonly estadoDelEnvio: EstadoDelEnvio | null;
}

/**
 * Ventas de la empresa de la transacción. Solo lee e inserta: una venta no se edita ni se borra. RLS limita todo a
 * esa empresa, así que ningún método recibe una empresa.
 */
export interface RepositorioDeVentas {
  conId(id: string): Promise<VentaGuardada | null>;
  huellaDe(id: string): Promise<string | null>;
  /** Guarda la venta y sus líneas. Devuelve false si el id ya existía (otra petición ganó): no guarda nada. */
  guardar(venta: Venta, resolucionId: string): Promise<boolean>;
  contarDesde(fecha: Date): Promise<number>;
  /** Gasta una venta del cupo diario de la persona (todas sus empresas). false, sin gastar, si ya usó `maximo`. */
  consumirCupoDePersona(usuarioId: string, maximo: number): Promise<boolean>;
  /** Enlaza la venta con su envío, de la misma clase de documento. Repetirlo no hace nada. */
  registrarEmision(ventaId: string, envioId: string, clase: ClaseDeDocumento): Promise<void>;
  envioDe(ventaId: string): Promise<EnvioDeLaVenta | null>;
  /** La factura enviada de la venta, o null si aún no se firmó. */
  facturaDe(ventaId: string): Promise<FacturaDeLaVenta | null>;
  /** La venta cuyo documento es este envío, o null si el envío no es de una venta. */
  deEnvio(envioId: string): Promise<VentaGuardada | null>;
  /** Las últimas ventas, de la más nueva a la más vieja. */
  recientes(limite: number): Promise<ResumenDeVenta[]>;
}
