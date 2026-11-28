import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { AccesoDianNoConfigurado } from '../../aplicacion/envio/acceso-dian-no-configurado.js';
import { asociadoAlSoftware, type CustodiaDeSecretos } from '../../aplicacion/puertos/custodia-de-secretos.js';
import type { ConfiguracionDian } from '../../aplicacion/puertos/generador-de-documento-electronico.js';
import type {
  ConfiguracionDeLaEmpresa,
  ProveedorDeConfiguracionDian,
} from '../../aplicacion/puertos/proveedor-de-configuracion-dian.js';
import type { RepositoriosDeConfiguracion } from '../../aplicacion/puertos/repositorios-de-configuracion.js';
import type { ClaseDeDocumento } from '../../dominio/index.js';
import { configuracionValida } from '../dian-directa/ubl/configuracion-exigida.js';
import { leerSoftware } from './software-de-la-empresa.js';
import { CLAVE_TECNICA_DE_HABILITACION, NOMBRE_DEL_SOFTWARE } from './variables-por-clase.js';

/**
 * HU-07.04: el software con que factura una empresa, guardado por su dueño en la configuración DIAN. Si la empresa
 * ya guardó el software de esa clase, se usa SOLO lo guardado (nunca las variables DIAN_HAB_*); si no, se pregunta al
 * respaldo (el entorno, que sirve a una sola empresa de habilitación). El PIN se abre aquí y solo va al generador.
 * Software propio: el proveedor del software es el mismo facturador, con el NIT de sus datos fiscales.
 */
export class ConfiguracionDianGuardada implements ProveedorDeConfiguracionDian {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<Pick<RepositoriosDeConfiguracion, 'software' | 'datosFiscales'>>,
    private readonly custodia: CustodiaDeSecretos,
    private readonly respaldo: ProveedorDeConfiguracionDian,
  ) {}

  async para(contexto: ContextoEmpresa, clase: ClaseDeDocumento): Promise<ConfiguracionDeLaEmpresa> {
    const { software, facturador } = await leerSoftware(this.unidadDeTrabajo, contexto, clase);
    if (!software) return this.respaldo.para(contexto, clase);
    if (!facturador) throw new AccesoDianNoConfigurado();
    const nit = facturador.identificacion.numero;
    const configuracion: ConfiguracionDian = {
      ambiente: 'habilitacion',
      // La clave técnica de cada rango va con su resolución; esta es la del rango público de habilitación.
      claveTecnica: clase === 'factura' ? CLAVE_TECNICA_DE_HABILITACION : '',
      idSoftware: software.idSoftware,
      pinSoftware: this.custodia.descifrar(software.pinCifrado, asociadoAlSoftware(contexto.empresaId.valor, clase)),
      nitProveedorSoftware: nit,
      fabricante: software.fabricante && { ...software.fabricante, nombreDelSoftware: NOMBRE_DEL_SOFTWARE },
    };
    if (!configuracionValida(configuracion, clase)) throw new AccesoDianNoConfigurado();
    return { configuracion, nitDelFacturador: nit };
  }
}
