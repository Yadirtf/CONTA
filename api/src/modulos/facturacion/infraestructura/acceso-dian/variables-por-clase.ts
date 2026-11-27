import type { ClaseDeDocumento } from '../../dominio/index.js';

/**
 * Nombres de las variables de entorno de la habilitación de UNA empresa, por clase de documento (hasta EP-07). La DIAN
 * registra un software y un set de pruebas por modo de operación: la factura usa los `DIAN_HAB_*` de siempre y el
 * tiquete POS los `DIAN_HAB_POS_*`. El certificado, el NIT y la empresa son los mismos.
 */
export interface VariablesDeLaClase {
  readonly idSoftware: string;
  readonly pin: string;
  readonly testSetId: string;
}

export const VARIABLES_POR_CLASE: Readonly<Record<ClaseDeDocumento, VariablesDeLaClase>> = {
  factura: { idSoftware: 'DIAN_HAB_ID_SOFTWARE', pin: 'DIAN_HAB_PIN', testSetId: 'DIAN_HAB_TEST_SET_ID' },
  pos: { idSoftware: 'DIAN_HAB_POS_ID_SOFTWARE', pin: 'DIAN_HAB_POS_PIN', testSetId: 'DIAN_HAB_POS_TEST_SET_ID' },
};

/** Quién hizo el software (extensión FabricanteSoftware del tiquete POS). */
export const VARIABLES_DEL_FABRICANTE = {
  nombre: 'DIAN_HAB_POS_FABRICANTE_NOMBRE',
  razonSocial: 'DIAN_HAB_POS_FABRICANTE_RAZON_SOCIAL',
} as const;

export const NOMBRE_DEL_SOFTWARE = 'CONTA';
