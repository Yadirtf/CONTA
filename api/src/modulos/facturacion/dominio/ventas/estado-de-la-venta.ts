import type { EstadoDelEnvio } from '../envio-dian/estado-del-envio.js';

/**
 * Estado de una venta como lo ve el dueño (modo simple): guardada y en camino, aprobada o no aceptada por la DIAN.
 * - pendiente: la venta está guardada y su documento va hacia la DIAN (o se reintenta solo).
 * - aceptada: la DIAN la aprobó.
 * - rechazada: la DIAN no la aceptó; la venta no se edita, se corrige con un documento nuevo.
 */
export type EstadoDeLaVenta = 'pendiente' | 'aceptada' | 'rechazada';

/** Sin envío todavía (falta firmar o encolar) también es pendiente: nunca se dice «aprobada» antes de tiempo. */
export function estadoDeLaVenta(envio: EstadoDelEnvio | null): EstadoDeLaVenta {
  if (envio === 'aceptado') return 'aceptada';
  if (envio === 'rechazado') return 'rechazada';
  return 'pendiente';
}
