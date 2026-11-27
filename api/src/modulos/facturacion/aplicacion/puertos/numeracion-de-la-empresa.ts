import type { Participante, ResolucionDeNumeracion } from '../../dominio/index.js';

export interface ResolucionVigente {
  readonly id: string;
  readonly resolucion: ResolucionDeNumeracion;
}

/** Datos fiscales y numeración de la empresa de la transacción (los llena configurar-facturacion hasta EP-07). */
export interface NumeracionDeLaEmpresa {
  /** El facturador como va en la factura; null si la empresa todavía no tiene datos fiscales. */
  emisor(): Promise<Participante | null>;
  /** La resolución vigente en `fecha` (AAAA-MM-DD) que aún tiene números; null si no hay. */
  resolucionVigente(fecha: string): Promise<ResolucionVigente | null>;
  resolucion(id: string): Promise<ResolucionDeNumeracion | null>;
  /**
   * Toma el siguiente consecutivo de la resolución, o null si se agotó. Queda bloqueada hasta el final de la
   * transacción: si la venta no se guarda, el número vuelve (sin huecos ni duplicados).
   */
  reservarConsecutivo(resolucionId: string): Promise<number | null>;
}
