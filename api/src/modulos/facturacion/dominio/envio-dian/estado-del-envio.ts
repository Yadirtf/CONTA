/**
 * Estados del envío de un documento a la DIAN:
 * - pendiente: aún no hay acuse de recibo (falta enviar el ZIP o reintentar el envío).
 * - en-validacion: la DIAN recibió el ZIP (hay ZipKey) y se consulta el resultado.
 * - aceptado / rechazado: la DIAN respondió; son finales.
 * - fallido: se agotaron los reintentos sin respuesta; es final y requiere revisión humana.
 */
export const ESTADOS_DEL_ENVIO = ['pendiente', 'en-validacion', 'aceptado', 'rechazado', 'fallido'] as const;
export type EstadoDelEnvio = (typeof ESTADOS_DEL_ENVIO)[number];

export function esEstadoFinal(estado: EstadoDelEnvio): boolean {
  return estado === 'aceptado' || estado === 'rechazado' || estado === 'fallido';
}
