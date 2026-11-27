import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { ConfiguracionDian } from './generador-de-documento-electronico.js';

/** El software y el ambiente con que factura una empresa, y el NIT del facturador al que pertenecen. */
export interface ConfiguracionDeLaEmpresa {
  readonly configuracion: ConfiguracionDian;
  /** NIT (sin dígito) del facturador habilitado: tiene que ser el mismo de sus datos fiscales. */
  readonly nitDelFacturador: string;
}

/**
 * Entrega la configuración DIAN de una empresa o lanza AccesoDianNoConfigurado. Hoy sale del entorno para una
 * sola empresa (habilitación); el asistente de habilitación (EP-07) la guardará por empresa detrás de este puerto.
 */
export interface ProveedorDeConfiguracionDian {
  para(contexto: ContextoEmpresa): Promise<ConfiguracionDeLaEmpresa>;
}

export const PROVEEDOR_DE_CONFIGURACION_DIAN = Symbol('ProveedorDeConfiguracionDian');
