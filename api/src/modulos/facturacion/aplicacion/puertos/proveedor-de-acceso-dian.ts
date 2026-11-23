import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { AccesoDian } from './servicio-web-dian.js';

/**
 * Entrega el certificado y el set de pruebas de una empresa. Hoy los lee de variables de entorno (solo
 * habilitación); la custodia cifrada por empresa llega en HU-07.02 detrás de este mismo puerto.
 */
export interface ProveedorDeAccesoDian {
  para(contexto: ContextoEmpresa): Promise<AccesoDian>;
}

export const PROVEEDOR_DE_ACCESO_DIAN = Symbol('ProveedorDeAccesoDian');
