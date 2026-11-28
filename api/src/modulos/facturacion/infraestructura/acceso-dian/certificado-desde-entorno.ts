import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { VariablesDeEntorno } from '../../../../compartido/infraestructura/config/base-de-datos.js';
import { AccesoDianNoConfigurado } from '../../aplicacion/envio/acceso-dian-no-configurado.js';
import { CertificadoDeFirma } from '../../aplicacion/firma/certificado-de-firma.js';

/**
 * El certificado de firma de UNA empresa, tomado del entorno (DIAN_HAB_EMPRESA_ID, DIAN_HAB_P12_BASE64 y
 * DIAN_HAB_P12_CONTRASENA) hasta la custodia por empresa de HU-07.02. Cualquier otra empresa recibe
 * AccesoDianNoConfigurado: así nadie firma con el certificado de otro. Se lee en cada llamada.
 */
export function certificadoDesdeEntorno(contexto: ContextoEmpresa, env: VariablesDeEntorno): CertificadoDeFirma {
  const empresa = env['DIAN_HAB_EMPRESA_ID'];
  const p12 = env['DIAN_HAB_P12_BASE64'];
  const contrasena = env['DIAN_HAB_P12_CONTRASENA'];
  if (!empresa || empresa.toLowerCase() !== contexto.empresaId.valor || !p12 || contrasena === undefined) {
    throw new AccesoDianNoConfigurado();
  }
  return CertificadoDeFirma.de(Buffer.from(p12, 'base64'), contrasena);
}
