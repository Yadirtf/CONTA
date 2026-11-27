import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { ClaseDeDocumento } from '../../dominio/index.js';
import type { AccesoDian } from './servicio-web-dian.js';

/**
 * Entrega el certificado y el set de pruebas de una empresa para una clase de documento: la factura y el tiquete
 * POS tienen cada uno su set de pruebas en la habilitación (HU-06.02). Hoy los lee de variables de entorno (solo
 * habilitación); la custodia cifrada por empresa llega en HU-07.02 detrás de este mismo puerto.
 */
export interface ProveedorDeAccesoDian {
  para(contexto: ContextoEmpresa, clase: ClaseDeDocumento): Promise<AccesoDian>;
}

export const PROVEEDOR_DE_ACCESO_DIAN = Symbol('ProveedorDeAccesoDian');
