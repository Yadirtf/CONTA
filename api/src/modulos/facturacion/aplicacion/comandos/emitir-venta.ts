import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { ProveedorDeAccesoDian } from '../puertos/proveedor-de-acceso-dian.js';
import type { ProveedorDeConfiguracionDian } from '../puertos/proveedor-de-configuracion-dian.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';
import { facturacionNoHabilitada, ventaNoEncontrada } from '../ventas/errores-de-venta.js';
import type { FirmarDocumentoElectronico } from './firmar-documento-electronico.js';
import type { GenerarXmlFactura } from './generar-xml-factura.js';
import type { SolicitarEnvioDian } from './solicitar-envio-dian.js';

/**
 * HU-06.01: arma la factura de una venta ya guardada, la firma y la deja en la cola de la DIAN. Se puede repetir
 * sin daño: la factura sale igual de la venta (mismo CUFE), la solicitud de envío es idempotente por CUFE y el
 * enlace venta → envío se guarda una sola vez. Lo llaman RegistrarVenta y el reparador de emisiones.
 */
export class EmitirVenta {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>,
    private readonly configuracionDian: ProveedorDeConfiguracionDian,
    private readonly accesoDian: ProveedorDeAccesoDian,
    private readonly generar: Pick<GenerarXmlFactura, 'ejecutar'>,
    private readonly firmar: Pick<FirmarDocumentoElectronico, 'ejecutar'>,
    private readonly solicitarEnvio: Pick<SolicitarEnvioDian, 'ejecutar'>,
  ) {}

  async ejecutar(contexto: ContextoEmpresa, ventaId: string): Promise<void> {
    const leido = await this.unidadDeTrabajo.ejecutar(contexto, async ({ ventas, numeracion, emisiones }) => {
      const guardada = await ventas.conId(ventaId);
      if (!guardada) throw ventaNoEncontrada();
      if (await ventas.envioDe(ventaId)) {
        await emisiones.completar(ventaId);
        return null;
      }
      const [emisor, resolucion] = await Promise.all([numeracion.emisor(), numeracion.resolucion(guardada.resolucionId)]);
      if (!emisor || !resolucion) throw facturacionNoHabilitada();
      return guardada.venta.aFactura(emisor, resolucion);
    });
    if (!leido) return;

    const [{ configuracion, nitDelFacturador }, acceso] = await Promise.all([
      this.configuracionDian.para(contexto),
      this.accesoDian.para(contexto),
    ]);
    if (leido.emisor.identificacion.numero !== nitDelFacturador) throw facturacionNoHabilitada();
    const documento = this.firmar.ejecutar(this.generar.ejecutar(leido, configuracion), acceso.certificado);
    const { envioId } = await this.solicitarEnvio.ejecutar(contexto, {
      documento,
      numero: leido.numero.aTexto(),
      nitEmisor: nitDelFacturador,
    });

    await this.unidadDeTrabajo.ejecutar(contexto, async ({ ventas, emisiones }) => {
      await ventas.registrarEmision(ventaId, envioId);
      await emisiones.completar(ventaId);
    });
  }
}
