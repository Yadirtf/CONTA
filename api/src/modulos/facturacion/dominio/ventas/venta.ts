import { Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import type { ClaseDeDocumento } from '../documentos/clase-de-documento.js';
import { puntoDeVenta, type PuntoDeVenta } from '../documentos/punto-de-venta.js';
import { cabeEnPos } from '../documentos/tope-del-pos.js';
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
  /** Factura o tiquete POS (HU-06.02): la clase de la resolución que dio el número. */
  readonly clase: ClaseDeDocumento;
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
    if (datos.clase === 'pos' && !cabeEnPos(venta.base, MomentoDeEmision.desde(datos.emitidaEn).fecha)) {
      throw new ErrorDominio('pos.tope-excedido', 'El tiquete POS no puede pasar de 5 UVT sin impuestos: emite factura');
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

  get clase(): ClaseDeDocumento {
    return this.datos.clase;
  }

  /**
   * El documento electrónico de contado de esta venta: factura o tiquete POS, según su clase. Las líneas van tal
   * como se cobraron, sin recalcular. La resolución tiene que ser de la misma clase que la venta.
   */
  aFactura(emisor: Participante, resolucion: ResolucionDeNumeracion): Factura {
    if (resolucion.clase !== this.datos.clase) {
      throw new ErrorDominio('venta.resolucion-de-otra-clase', 'La resolución no es de la clase de documento de la venta');
    }
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
      puntoDeVenta: this.datos.clase === 'pos' ? this.cajaDelTiquete(emisor) : null,
    });
  }

  /**
   * La caja del tiquete POS. En CONTA la caja es el celular con la app: sale siempre igual de la venta guardada.
   * El cajero va como un código de la persona (no su celular ni su nombre, que CONTA no guarda).
   */
  private cajaDelTiquete(emisor: Participante): PuntoDeVenta {
    const direccion = emisor.direccion;
    return puntoDeVenta({
      placa: CAJA_DE_LA_APP,
      ubicacion: direccion ? `${direccion.linea}, ${direccion.ciudad}` : emisor.razonSocial,
      cajero: `Usuario ${this.datos.creadaPor.slice(0, 8)}`,
      tipo: TIPO_DE_CAJA,
      codigoDeVenta: this.datos.numero.aTexto(),
    });
  }
}

const CAJA_DE_LA_APP = 'CONTA-APP';
const TIPO_DE_CAJA = 'Celular con la app CONTA';
