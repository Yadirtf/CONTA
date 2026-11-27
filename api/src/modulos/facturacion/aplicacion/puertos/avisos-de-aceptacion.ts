/**
 * Lo que pasa, en la misma transacción, cuando la DIAN acepta un documento. El envío no sabe de ventas: solo avisa.
 * Hoy lo usa el correo de la factura (HU-06.08); la contabilidad (EP-10) se colgará de aquí.
 */
export interface AvisosDeAceptacion {
  /** true si quedó algo por hacer fuera de la transacción (por ejemplo, un correo que enviar). */
  documentoAceptado(envioId: string, ahora: Date): Promise<boolean>;
}
