import type { ClaseDeDocumento, Participante, ResolucionDeNumeracion } from '../../dominio/index.js';

export interface ResolucionVigente {
  readonly id: string;
  readonly resolucion: ResolucionDeNumeracion;
}

/** Datos fiscales y numeración de la empresa de la transacción (los carga el dueño en la configuración DIAN, HU-07.04). */
export interface NumeracionDeLaEmpresa {
  /** El facturador como va en la factura; null si la empresa todavía no tiene datos fiscales. */
  emisor(): Promise<Participante | null>;
  /** La resolución de esa clase vigente en `fecha` (AAAA-MM-DD) que aún tiene números; null si no hay. */
  resolucionVigente(fecha: string, clase: ClaseDeDocumento): Promise<ResolucionVigente | null>;
  resolucion(id: string): Promise<ResolucionDeNumeracion | null>;
  /**
   * Clave técnica del rango de una resolución de factura, ya abierta (HU-07.04), o null si se guardó sin ella (vale
   * entonces la del software). Solo la usa el cálculo del CUFE.
   */
  claveTecnica(resolucionId: string): Promise<string | null>;
  /**
   * Toma el siguiente consecutivo de la resolución, o null si se agotó. Queda bloqueada hasta el final de la
   * transacción: si la venta no se guarda, el número vuelve (sin huecos ni duplicados).
   */
  reservarConsecutivo(resolucionId: string): Promise<number | null>;
}
