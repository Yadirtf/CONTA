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

/**
 * Productos que una persona puede crear en un día (de Colombia) sumando todas sus empresas (hallazgos H3 y N1 de
 * la prueba de ataque). El tope por empresa no ve las otras empresas de la persona (RLS) y con 50 empresas daría
 * 25.000 al día. Se cuenta en la base, así que no se borra cuando la API se reinicia.
 */
export const MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA = 1000;

export function comprobarCupoDePersona(quedabaCupo: boolean): void {
  if (!quedabaCupo) {
    throw new ErrorDominio(
      'producto.limite-por-persona',
      `Puedes crear hasta ${MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA} productos por día entre todos tus negocios. Intenta mañana`,
    );
  }
}
