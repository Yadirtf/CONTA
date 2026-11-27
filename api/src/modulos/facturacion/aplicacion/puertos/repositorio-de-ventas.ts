import type { EstadoDelEnvio, Venta } from '../../dominio/index.js';
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
  /** Enlaza la venta con su envío. Repetirlo no hace nada. */
  registrarEmision(ventaId: string, envioId: string): Promise<void>;
  envioDe(ventaId: string): Promise<EnvioDeLaVenta | null>;
}
