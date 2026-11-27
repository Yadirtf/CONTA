import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { VariablesDeEntorno } from '../../../../compartido/infraestructura/config/base-de-datos.js';
import { AccesoDianNoConfigurado } from '../../aplicacion/envio/acceso-dian-no-configurado.js';
import type {
  ConfiguracionDeLaEmpresa,
  ProveedorDeConfiguracionDian,
} from '../../aplicacion/puertos/proveedor-de-configuracion-dian.js';

/** Clave técnica pública del rango de pruebas de habilitación (SETP 990000000-995000000). */
const CLAVE_TECNICA_DE_HABILITACION = 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c';

/**
 * Software de facturación de UNA empresa, tomado del entorno (solo habilitación), igual que AccesoDianDesdeEntorno:
 * cualquier otra empresa recibe AccesoDianNoConfigurado. El PIN y la clave técnica son reservados y nunca salen de
 * aquí salvo hacia el cálculo del CUFE y del código de seguridad.
 */
export class ConfiguracionDianDesdeEntorno implements ProveedorDeConfiguracionDian {
  constructor(private readonly env: VariablesDeEntorno = process.env) {}

  para(contexto: ContextoEmpresa): Promise<ConfiguracionDeLaEmpresa> {
    const empresa = this.env['DIAN_HAB_EMPRESA_ID'];
    const idSoftware = this.env['DIAN_HAB_ID_SOFTWARE'];
    const pinSoftware = this.env['DIAN_HAB_PIN'];
    const nit = this.env['DIAN_HAB_NIT'];
    if (!empresa || empresa.toLowerCase() !== contexto.empresaId.valor || !idSoftware || !pinSoftware || !nit) {
      return Promise.reject(new AccesoDianNoConfigurado());
    }
    return Promise.resolve({
      configuracion: {
        ambiente: 'habilitacion',
        claveTecnica: this.env['DIAN_HAB_CLAVE_TECNICA'] || CLAVE_TECNICA_DE_HABILITACION,
        idSoftware,
        pinSoftware,
        // Software propio: el proveedor del software es el mismo facturador.
        nitProveedorSoftware: nit,
      },
      nitDelFacturador: nit,
    });
  }
}
