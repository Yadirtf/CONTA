import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import type { VariablesDeEntorno } from '../../../../compartido/infraestructura/config/base-de-datos.js';
import { AccesoDianNoConfigurado } from '../../aplicacion/envio/acceso-dian-no-configurado.js';
import type { ConfiguracionDian, FabricanteDelSoftware } from '../../aplicacion/puertos/generador-de-documento-electronico.js';
import type {
  ConfiguracionDeLaEmpresa,
  ProveedorDeConfiguracionDian,
} from '../../aplicacion/puertos/proveedor-de-configuracion-dian.js';
import type { ClaseDeDocumento } from '../../dominio/index.js';
import { configuracionValida } from '../dian-directa/ubl/configuracion-exigida.js';
import {
  CLAVE_TECNICA_DE_HABILITACION,
  NOMBRE_DEL_SOFTWARE,
  VARIABLES_DEL_FABRICANTE,
  VARIABLES_POR_CLASE,
} from './variables-por-clase.js';

/**
 * Software de facturación de UNA empresa, tomado del entorno (solo habilitación). Es el respaldo de las empresas que
 * no guardaron su software en la configuración DIAN (HU-07.04). Igual que AccesoDianDesdeEntorno:
 * cualquier otra empresa recibe AccesoDianNoConfigurado. El PIN y la clave técnica son reservados y nunca salen de
 * aquí salvo hacia el cálculo del código único y del código de seguridad. Cada clase de documento tiene su software
 * (HU-06.02); si faltan las variables del POS, el POS no está habilitado y las ventas salen con factura.
 */
export class ConfiguracionDianDesdeEntorno implements ProveedorDeConfiguracionDian {
  constructor(private readonly env: VariablesDeEntorno = process.env) {}

  para(contexto: ContextoEmpresa, clase: ClaseDeDocumento): Promise<ConfiguracionDeLaEmpresa> {
    const variables = VARIABLES_POR_CLASE[clase];
    const empresa = this.env['DIAN_HAB_EMPRESA_ID'];
    const idSoftware = this.env[variables.idSoftware];
    const pinSoftware = this.env[variables.pin];
    const nit = this.env['DIAN_HAB_NIT'];
    const fabricante = clase === 'pos' ? this.fabricante() : null;
    if (!empresa || empresa.toLowerCase() !== contexto.empresaId.valor || !idSoftware || !pinSoftware || !nit) {
      return Promise.reject(new AccesoDianNoConfigurado());
    }
    if (clase === 'pos' && !fabricante) return Promise.reject(new AccesoDianNoConfigurado());
    const configuracion: ConfiguracionDian = {
      ambiente: 'habilitacion',
      // El CUDE del tiquete POS no usa clave técnica: se calcula con el PIN.
      claveTecnica: clase === 'factura' ? this.env['DIAN_HAB_CLAVE_TECNICA'] || CLAVE_TECNICA_DE_HABILITACION : '',
      idSoftware,
      pinSoftware,
      // Software propio: el proveedor del software es el mismo facturador.
      nitProveedorSoftware: nit,
      fabricante,
    };
    // Una configuración que el generador rechazaría cuenta como no configurada: así la venta no elige el POS ni gasta
    // un número que después no se puede emitir (hallazgo H3 de la prueba de ataque).
    if (!configuracionValida(configuracion, clase)) return Promise.reject(new AccesoDianNoConfigurado());
    return Promise.resolve({ configuracion, nitDelFacturador: nit });
  }

  private fabricante(): FabricanteDelSoftware | null {
    const nombre = this.env[VARIABLES_DEL_FABRICANTE.nombre];
    const razonSocial = this.env[VARIABLES_DEL_FABRICANTE.razonSocial];
    if (!nombre || !razonSocial) return null;
    return { nombre, razonSocial, nombreDelSoftware: NOMBRE_DEL_SOFTWARE };
  }
}
