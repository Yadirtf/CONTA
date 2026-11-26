import {
  DecimalExacto,
  type Desglose,
  desglosarDesdeTotal,
  type Dinero,
  ErrorDominio,
  type TipoDeIva,
  tratamientoDeIva,
  type TratamientoDeIva,
} from '../../../../compartido/dominio/index.js';
import { codigoDeProducto } from './codigo-de-producto.js';
import { nombreDeProducto, nombreParaBuscar } from './nombre-de-producto.js';
import { precioDeVenta } from './precio-de-venta.js';
import { type UnidadDeMedida, unidadDeMedida } from './unidad-de-medida.js';

/** Lo que llega para crear un producto, ya leído por la presentación pero sin validar. */
export interface DatosDeProductoNuevo {
  readonly id: string;
  readonly nombre: string;
  readonly codigo: string | null;
  readonly unidad: string | null;
  /** El precio como lo escribió la persona, en pesos con punto decimal: «10000» o «8403.36». */
  readonly precio: string;
  /** true si el precio escrito ya trae el IVA (lo normal en el mostrador). */
  readonly precioIncluyeIva: boolean;
  readonly tipoDeIva: TipoDeIva;
  readonly tarifaIva: string | null;
}

export interface DatosDeProducto {
  readonly id: string;
  readonly nombre: string;
  readonly codigo: string | null;
  readonly unidad: UnidadDeMedida;
  /** Lo que paga el comprador por una unidad, con el IVA incluido. Es el único precio que se guarda. */
  readonly precio: Dinero;
  readonly iva: TratamientoDeIva;
  readonly creadoEn: Date;
  readonly creadoPor: string;
}

const CANTIDAD = /^\d{1,7}(\.\d{1,6})?$/;
const CANTIDAD_MAXIMA = DecimalExacto.desde('1000000');

/**
 * Producto del catálogo de una empresa (HU-05.02): nombre, precio de venta con IVA incluido y cómo lo trata el
 * IVA (gravado al 19 % o 5 %, exento o excluido). Al vender, la base y el impuesto salen de aquí, exactos; la
 * factura copia estos datos al emitirse, así que cambiar un producto nunca cambia un documento ya enviado.
 */
export class Producto {
  private constructor(readonly datos: DatosDeProducto) {}

  static crear(nuevo: DatosDeProductoNuevo, creadoPor: string, ahora: Date): Producto {
    const iva = tratamientoDeIva(nuevo.tipoDeIva, nuevo.tarifaIva);
    return new Producto({
      id: nuevo.id,
      nombre: nombreDeProducto(nuevo.nombre),
      codigo: codigoDeProducto(nuevo.codigo),
      unidad: unidadDeMedida(nuevo.unidad),
      precio: precioDeVenta(nuevo.precio, nuevo.precioIncluyeIva, iva),
      iva,
      creadoEn: ahora,
      creadoPor,
    });
  }

  /** Producto leído de la base: ya se validó al crearlo. */
  static guardado(datos: DatosDeProducto): Producto {
    return new Producto(datos);
  }

  get id(): string {
    return this.datos.id;
  }

  /** El nombre como se busca (sin tildes ni mayúsculas); se guarda junto al nombre. */
  get nombreParaBuscar(): string {
    return nombreParaBuscar(this.datos.nombre);
  }

  /**
   * Base e IVA de vender `cantidad` unidades. Se separa el total de la línea (precio × cantidad, en centavos), no
   * el precio unitario: así base + IVA es exactamente lo que se cobra, aunque sean 3 unidades o 0,75 kg.
   */
  venta(cantidad: string): Desglose {
    if (!CANTIDAD.test(cantidad)) throw cantidadInvalida();
    const unidades = DecimalExacto.desde(cantidad);
    if (unidades.esCero() || unidades.comparar(CANTIDAD_MAXIMA) > 0) throw cantidadInvalida();
    const desglose = desglosarDesdeTotal(this.datos.precio.multiplicarPor(unidades), this.datos.iva);
    // Una cantidad tan pequeña que la línea vale $0,00 no es una venta (observación de la prueba de ataque).
    if (desglose.total.esCero()) throw cantidadInvalida();
    return desglose;
  }
}

const cantidadInvalida = () => new ErrorDominio('producto.cantidad-invalida', 'La cantidad es mayor que cero, hasta 1.000.000, con hasta 6 decimales, y la línea vale al menos un centavo');
