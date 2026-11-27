import { Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import { Factura } from '../entidades/factura.js';
import { LineaDeFactura } from '../entidades/linea-de-factura.js';
import type { ResolucionDeNumeracion } from '../entidades/resolucion-de-numeracion.js';
import { MomentoDeEmision } from '../objetos-valor/momento-de-emision.js';
import { NumeroDeFactura } from '../objetos-valor/numero-de-factura.js';
import type { Participante } from '../objetos-valor/participante.js';
import { TOTAL_MAXIMO } from './limites-de-ventas.js';
import type { LineaDeVenta } from './linea-de-venta.js';
import { codigoDianDe, type MedioDePago } from './medio-de-pago.js';

export interface DatosDeVenta {
  readonly id: string;
  /** SHA-256 del pedido (pedido-de-venta.ts): el mismo id con otro pedido no es un reintento. */
  readonly huella: string;
  readonly numero: NumeroDeFactura;
  readonly emitidaEn: Date;
  /** El adquirente como queda en la factura: consumidor final o un comprador del catálogo. */
  readonly comprador: Participante;
  readonly lineas: readonly LineaDeVenta[];
  readonly medioDePago: MedioDePago;
  readonly creadaPor: string;
}

/**
 * Una venta emitida (HU-06.01): lo vendido, a quién, cómo pagó, su número y su hora. No cambia nunca: si hay un
 * error se corrige con una nota (HU-06.03). De aquí sale la factura electrónica, siempre igual para la misma venta,
 * así que su CUFE no cambia aunque la firma se repita.
 */
export class Venta {
  readonly base: Dinero;
  readonly iva: Dinero;
  readonly total: Dinero;

  private constructor(readonly datos: DatosDeVenta) {
    this.base = Dinero.total(datos.lineas.map((l) => l.desglose.base));
    this.iva = Dinero.total(datos.lineas.map((l) => l.desglose.iva));
    this.total = this.base.sumar(this.iva);
  }

  static registrar(datos: DatosDeVenta): Venta {
    if (datos.lineas.length === 0) throw new ErrorDominio('venta.lineas-invalidas', 'La venta lleva al menos un producto');
    const venta = new Venta({ ...datos, lineas: [...datos.lineas] });
    if (venta.total.monto.comparar(TOTAL_MAXIMO) > 0) {
      throw new ErrorDominio('venta.total-excedido', 'Una venta no puede pasar de $1.000.000.000');
    }
    return venta;
  }

  /** Venta leída de la base: ya se validó al registrarla. */
  static guardada(datos: DatosDeVenta): Venta {
    return new Venta(datos);
  }

  get id(): string {
    return this.datos.id;
  }

  /** La factura electrónica de contado de esta venta. Las líneas van tal como se cobraron, sin recalcular. */
  aFactura(emisor: Participante, resolucion: ResolucionDeNumeracion): Factura {
    return Factura.emitir({
      numero: this.datos.numero,
      emision: MomentoDeEmision.desde(this.datos.emitidaEn),
      resolucion,
      emisor,
      adquirente: this.datos.comprador,
      lineas: this.datos.lineas.map(({ articulo, cantidad, desglose }) =>
        LineaDeFactura.desdeDesglose({
          descripcion: articulo.nombre,
          cantidad: cantidad.aTexto(),
          unidad: articulo.unidad,
          codigo: articulo.codigo,
          desglose,
          tarifaIva: articulo.iva.tarifa,
        }),
      ),
      formaDePago: { metodo: 'contado', medio: codigoDianDe(this.datos.medioDePago), vence: null },
    });
  }
}
