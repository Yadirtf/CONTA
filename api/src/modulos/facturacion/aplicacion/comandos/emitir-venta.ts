import type { ContextoEmpresa, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { ProveedorDeAccesoDian } from '../puertos/proveedor-de-acceso-dian.js';
import type { ProveedorDeConfiguracionDian } from '../puertos/proveedor-de-configuracion-dian.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';
import { facturacionNoHabilitada, ventaNoEncontrada } from '../ventas/errores-de-venta.js';
import { codigoDeFalla, siguienteIntento } from '../ventas/falla-de-emision.js';
import type { FirmarDocumentoElectronico } from './firmar-documento-electronico.js';
import type { GenerarXmlFactura } from './generar-xml-factura.js';
import type { SolicitarEnvioDian } from './solicitar-envio-dian.js';

/**
 * HU-06.01 y HU-06.02: arma el documento de una venta ya guardada (factura o tiquete POS, con el software de su
 * clase), lo firma y lo deja en la cola de la DIAN. Se puede repetir
 * sin daño: la factura sale igual de la venta (mismo CUFE), la solicitud de envío es idempotente por CUFE y el
 * enlace venta → envío se guarda una sola vez. Lo llaman RegistrarVenta y el reparador de emisiones.
 * Cada falla queda en la cola de emisión con su código y su intento, y el siguiente se espacia cada vez más.
 */
export class EmitirVenta {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>,
    private readonly configuracionDian: ProveedorDeConfiguracionDian,
    private readonly accesoDian: ProveedorDeAccesoDian,
    private readonly generar: Pick<GenerarXmlFactura, 'ejecutar'>,
    private readonly firmar: Pick<FirmarDocumentoElectronico, 'ejecutar'>,
    private readonly solicitarEnvio: Pick<SolicitarEnvioDian, 'ejecutar'>,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(contexto: ContextoEmpresa, ventaId: string): Promise<void> {
    try {
      await this.emitir(contexto, ventaId);
    } catch (error) {
      await this.registrarFalla(contexto, ventaId, error).catch(() => undefined);
      throw error;
    }
  }

  private async registrarFalla(contexto: ContextoEmpresa, ventaId: string, error: unknown): Promise<void> {
    await this.unidadDeTrabajo.ejecutar(contexto, async ({ emisiones }) => {
      const intentos = await emisiones.registrarFalla(ventaId, codigoDeFalla(error));
      if (intentos > 0) await emisiones.reprogramar(ventaId, siguienteIntento(this.reloj.ahora(), intentos));
    });
  }

  private async emitir(contexto: ContextoEmpresa, ventaId: string): Promise<void> {
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
      this.configuracionDian.para(contexto, leido.clase),
      this.accesoDian.para(contexto, leido.clase),
    ]);
    if (leido.emisor.identificacion.numero !== nitDelFacturador) throw facturacionNoHabilitada();
    const documento = this.firmar.ejecutar(this.generar.ejecutar(leido, configuracion), acceso.certificado);
    const { envioId } = await this.solicitarEnvio.ejecutar(contexto, {
      documento,
      numero: leido.numero.aTexto(),
      nitEmisor: nitDelFacturador,
      clase: leido.clase,
    });

    await this.unidadDeTrabajo.ejecutar(contexto, async ({ ventas, emisiones }) => {
      await ventas.registrarEmision(ventaId, envioId, leido.clase);
      await emisiones.completar(ventaId);
    });
  }
}
