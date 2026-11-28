import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { VariablesDeEntorno } from '../../../../compartido/infraestructura/config/base-de-datos.js';
import { AccesoDianNoConfigurado } from '../../aplicacion/envio/acceso-dian-no-configurado.js';
import type { ProveedorDeAccesoDian } from '../../aplicacion/puertos/proveedor-de-acceso-dian.js';
import type { AccesoDian } from '../../aplicacion/puertos/servicio-web-dian.js';
import type { ClaseDeDocumento } from '../../dominio/index.js';
import { certificadoDesdeEntorno } from './certificado-desde-entorno.js';
import { VARIABLES_POR_CLASE } from './variables-por-clase.js';

/**
 * Acceso a la DIAN de UNA empresa, tomado de variables de entorno (solo habilitación). Es el respaldo de las empresas
 * que todavía no guardaron su software en la configuración DIAN (HU-07.04). El certificado es uno; el set de pruebas
 * depende de la clase de documento.
 */
export class AccesoDianDesdeEntorno implements ProveedorDeAccesoDian {
  constructor(private readonly env: VariablesDeEntorno = process.env) {}

  para(contexto: ContextoEmpresa, clase: ClaseDeDocumento): Promise<AccesoDian> {
    try {
      const testSetId = this.env[VARIABLES_POR_CLASE[clase].testSetId];
      if (!testSetId) throw new AccesoDianNoConfigurado();
      return Promise.resolve({ certificado: certificadoDesdeEntorno(contexto, this.env), testSetId });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new AccesoDianNoConfigurado());
    }
  }
}
