import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { VariablesDeEntorno } from '../../../../compartido/infraestructura/config/base-de-datos.js';
import { AccesoDianNoConfigurado } from '../../aplicacion/envio/acceso-dian-no-configurado.js';
import { CertificadoDeFirma } from '../../aplicacion/firma/certificado-de-firma.js';
import type { ProveedorDeAccesoDian } from '../../aplicacion/puertos/proveedor-de-acceso-dian.js';
import type { AccesoDian } from '../../aplicacion/puertos/servicio-web-dian.js';
import type { ClaseDeDocumento } from '../../dominio/index.js';
import { VARIABLES_POR_CLASE } from './variables-por-clase.js';

/**
 * Acceso a la DIAN de UNA empresa, tomado de variables de entorno (solo habilitación, mientras llega la
 * custodia por empresa de HU-07.02). Cualquier otra empresa recibe AccesoDianNoConfigurado: así nadie firma
 * con el certificado de otro. El certificado es uno; el set de pruebas depende de la clase de documento. Las variables se leen en cada llamada y el .p12 se copia a un CertificadoDeFirma.
 */
export class AccesoDianDesdeEntorno implements ProveedorDeAccesoDian {
  constructor(private readonly env: VariablesDeEntorno = process.env) {}

  para(contexto: ContextoEmpresa, clase: ClaseDeDocumento): Promise<AccesoDian> {
    const empresa = this.env['DIAN_HAB_EMPRESA_ID'];
    const p12 = this.env['DIAN_HAB_P12_BASE64'];
    const contrasena = this.env['DIAN_HAB_P12_CONTRASENA'];
    const testSetId = this.env[VARIABLES_POR_CLASE[clase].testSetId];
    if (!empresa || empresa.toLowerCase() !== contexto.empresaId.valor || !p12 || contrasena === undefined || !testSetId) {
      return Promise.reject(new AccesoDianNoConfigurado());
    }
    return Promise.resolve({ certificado: CertificadoDeFirma.de(Buffer.from(p12, 'base64'), contrasena), testSetId });
  }
}
