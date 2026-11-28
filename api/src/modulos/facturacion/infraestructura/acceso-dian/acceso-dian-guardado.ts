import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { VariablesDeEntorno } from '../../../../compartido/infraestructura/config/base-de-datos.js';
import type { ProveedorDeAccesoDian } from '../../aplicacion/puertos/proveedor-de-acceso-dian.js';
import type { RepositoriosDeConfiguracion } from '../../aplicacion/puertos/repositorios-de-configuracion.js';
import type { AccesoDian } from '../../aplicacion/puertos/servicio-web-dian.js';
import type { ClaseDeDocumento } from '../../dominio/index.js';
import { certificadoDesdeEntorno } from './certificado-desde-entorno.js';
import { leerSoftware } from './software-de-la-empresa.js';

/**
 * HU-07.04: el set de pruebas sale del software guardado por el dueño; sin software guardado, del respaldo (el
 * entorno). El certificado sigue saliendo del entorno, de una sola empresa, hasta la custodia de HU-07.02.
 */
export class AccesoDianGuardado implements ProveedorDeAccesoDian {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<Pick<RepositoriosDeConfiguracion, 'software' | 'datosFiscales'>>,
    private readonly respaldo: ProveedorDeAccesoDian,
    private readonly env: VariablesDeEntorno = process.env,
  ) {}

  async para(contexto: ContextoEmpresa, clase: ClaseDeDocumento): Promise<AccesoDian> {
    const { software } = await leerSoftware(this.unidadDeTrabajo, contexto, clase);
    if (!software) return this.respaldo.para(contexto, clase);
    return { certificado: certificadoDesdeEntorno(contexto, this.env), testSetId: software.testSetId };
  }
}
