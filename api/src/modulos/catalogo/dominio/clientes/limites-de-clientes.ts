import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/**
 * Compradores nuevos por empresa en 24 horas. Una tienda real crea unos pocos al día; el tope frena a quien
 * use la cuenta de un cajero para llenar la base (el plan gratis de Neon tiene 0,5 GB para todos).
 */
export const MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA = 300;

export const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

export function comprobarQuePuedeCrear(creadosEnElDia: number): void {
  if (creadosEnElDia >= MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA) {
    throw new ErrorDominio(
      'cliente.limite-diario',
      `Puedes crear hasta ${MAXIMO_DE_CLIENTES_NUEVOS_POR_DIA} compradores por día. Intenta mañana`,
    );
  }
}
