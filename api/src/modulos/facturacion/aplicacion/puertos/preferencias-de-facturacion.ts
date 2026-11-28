/** Preferencias del negocio para facturar (HU-07.04). Sin fila, los valores por omisión. */
export interface PreferenciasDeFacturacion {
  /** true si el dueño pidió que nunca salga tiquete POS (ADR-0016). Por omisión, false. */
  siempreFactura(): Promise<boolean>;
  guardar(siempreFactura: boolean, usuarioId: string): Promise<void>;
}
