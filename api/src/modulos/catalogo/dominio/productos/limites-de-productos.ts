import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/**
 * Productos nuevos por empresa en 24 horas. Montar el catálogo de una tienda cabe en un par de días; el tope
 * frena a quien quiera llenar la base (el plan gratis de Neon tiene 0,5 GB para todos).
 */
export const MAXIMO_DE_PRODUCTOS_NUEVOS_POR_DIA = 500;

export function comprobarQuePuedeCrearProductos(creadosEnElDia: number): void {
  if (creadosEnElDia >= MAXIMO_DE_PRODUCTOS_NUEVOS_POR_DIA) {
    throw new ErrorDominio(
      'producto.limite-diario',
      `Puedes crear hasta ${MAXIMO_DE_PRODUCTOS_NUEVOS_POR_DIA} productos por día. Intenta mañana`,
    );
  }
}
