import type { ContextoDeMiembro, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import {
  MAXIMO_DE_VENTAS_POR_EMPRESA_AL_DIA,
  MAXIMO_DE_VENTAS_POR_PERSONA_AL_DIA,
  MomentoDeEmision,
  UN_DIA_EN_MS,
  NumeroDeFactura,
  type PedidoDeVenta,
  Venta,
} from '../../dominio/index.js';
import type { CatalogoDeVenta } from '../puertos/catalogo-de-venta.js';
import type { Despertador } from '../puertos/cola-de-trabajos.js';
import type { ProveedorDeConfiguracionDian } from '../puertos/proveedor-de-configuracion-dian.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';
import {
  ChoqueDeVenta,
  facturacionNoHabilitada,
  limiteDeVentasPorPersona,
  limiteDiarioDeVentas,
  sinResolucionVigente,
  ventaConOtroPedido,
} from '../ventas/errores-de-venta.js';
import { huellaDelPedido } from '../ventas/huella-del-pedido.js';
import { lineasDelPedido } from '../ventas/lineas-del-pedido.js';
import type { EmitirVenta } from './emitir-venta.js';

/** Espera antes de que el reparador retome una emisión que no terminó en la petición. */
const ESPERA_DEL_REPARADOR_MS = 60_000;

export interface VentaRegistrada {
  readonly ventaId: string;
  /** false si el id ya era de esta misma venta (un reintento): no se crea otra. */
  readonly nueva: boolean;
}

/**
 * HU-06.01: registra una venta y deja su factura en camino a la DIAN.
 * 1. Un reintento con el mismo pedido devuelve la venta guardada; con otro pedido, se rechaza.
 * 2. Antes de gastar un número se comprueba que la empresa puede facturar y se lee el catálogo.
 * 3. En una transacción corta se reserva el consecutivo y se guardan la venta y su emisión pendiente: todo o nada.
 * 4. Después, fuera de esa transacción, se firma y encola. Si falla, el reparador lo termina (el número ya es de la
 *    venta y el CUFE no cambia, así que no quedan huecos ni duplicados).
 */
export class RegistrarVenta {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>,
    private readonly catalogo: CatalogoDeVenta,
    private readonly configuracionDian: ProveedorDeConfiguracionDian,
    private readonly emitir: Pick<EmitirVenta, 'ejecutar'>,
    private readonly reloj: Reloj,
    private readonly despertador: Despertador,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, pedido: PedidoDeVenta): Promise<VentaRegistrada> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    const huella = await huellaDelPedido(pedido);
    const previa = await this.ventaPrevia(contexto, pedido.id, huella);
    if (previa) return previa;

    const { nitDelFacturador } = await this.configuracionDian.para(contexto).catch(() => {
      throw facturacionNoHabilitada();
    });
    const loQueSeVende = await this.catalogo.leer(contexto, pedido.lineas.map((l) => l.productoId), pedido.compradorId);
    const { lineas, comprador } = lineasDelPedido(pedido, loQueSeVende);
    const ahora = this.reloj.ahora();

    try {
      await this.unidadDeTrabajo.ejecutar(contexto, async ({ ventas, numeracion, emisiones }) => {
        const emisor = await numeracion.emisor();
        if (!emisor || emisor.identificacion.numero !== nitDelFacturador) throw facturacionNoHabilitada();
        const vigente = await numeracion.resolucionVigente(MomentoDeEmision.desde(ahora).fecha);
        if (!vigente) throw sinResolucionVigente();
        // Reservar primero bloquea la resolución: las ventas de la empresa se cuentan en fila y el tope no se pasa.
        const consecutivo = await numeracion.reservarConsecutivo(vigente.id);
        if (consecutivo === null) throw sinResolucionVigente();
        if ((await ventas.contarDesde(new Date(ahora.getTime() - UN_DIA_EN_MS))) >= MAXIMO_DE_VENTAS_POR_EMPRESA_AL_DIA) {
          throw limiteDiarioDeVentas();
        }
        if (!(await ventas.consumirCupoDePersona(contexto.usuarioId.valor, MAXIMO_DE_VENTAS_POR_PERSONA_AL_DIA))) {
          throw limiteDeVentasPorPersona();
        }
        const venta = Venta.registrar({
          id: pedido.id,
          huella,
          numero: NumeroDeFactura.de(vigente.resolucion.prefijo, consecutivo),
          emitidaEn: ahora,
          comprador,
          lineas,
          medioDePago: pedido.medioDePago,
          creadaPor: contexto.usuarioId.valor,
        });
        if (!(await ventas.guardar(venta, vigente.id))) throw new ChoqueDeVenta();
        await emisiones.encolar(venta.id, new Date(ahora.getTime() + ESPERA_DEL_REPARADOR_MS));
      });
    } catch (error) {
      // La transacción se deshizo, con su número. Quien ganó la carrera ya guardó la venta: se responde con ella.
      if (!(error instanceof ChoqueDeVenta)) throw error;
      const ganadora = await this.ventaPrevia(contexto, pedido.id, huella);
      if (ganadora) return ganadora;
      throw error;
    }

    // Firmar y encolar no deshace la venta si falla: queda pendiente y el reparador la termina.
    await this.emitir.ejecutar(contexto, pedido.id).catch(() => {
      this.despertador.programar(new Date(ahora.getTime() + ESPERA_DEL_REPARADOR_MS));
    });
    return { ventaId: pedido.id, nueva: true };
  }

  private async ventaPrevia(contexto: ContextoDeMiembro, id: string, huella: string): Promise<VentaRegistrada | null> {
    const guardada = await this.unidadDeTrabajo.ejecutar(contexto, ({ ventas }) => ventas.huellaDe(id));
    if (guardada === null) return null;
    if (guardada !== huella) throw ventaConOtroPedido();
    return { ventaId: id, nueva: false };
  }
}
