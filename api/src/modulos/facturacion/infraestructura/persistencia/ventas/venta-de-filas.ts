import { DecimalExacto, Dinero, esTipoDeIva, tratamientoDeIva } from '../../../../../compartido/dominio/index.js';
import { claseDeDocumento, medioDePago, NumeroDeFactura, Venta } from '../../../dominio/index.js';
import { compradorDeColumna, compradorEnColumna } from './comprador-en-columna.js';
import type { FilaDeLinea, FilaDeVenta } from './tablas-ventas.js';

type FilaNuevaDeVenta = Omit<FilaDeVenta, 'empresaId'>;
type FilaNuevaDeLinea = Omit<FilaDeLinea, 'empresaId'>;

/** Venta → filas, sin empresa: el repositorio pone la de la transacción y RLS la comprueba. */
export function filasDeVenta(venta: Venta, resolucionId: string): { venta: FilaNuevaDeVenta; lineas: FilaNuevaDeLinea[] } {
  const { datos } = venta;
  return {
    venta: {
      id: datos.id,
      huella: datos.huella,
      resolucionId,
      prefijo: datos.numero.prefijo,
      consecutivo: datos.numero.consecutivo,
      clase: datos.clase,
      emitidaEn: datos.emitidaEn,
      medioDePago: datos.medioDePago,
      comprador: compradorEnColumna(datos.comprador),
      base: venta.base.aTexto(),
      iva: venta.iva.aTexto(),
      total: venta.total.aTexto(),
      creadaPor: datos.creadaPor,
    },
    lineas: datos.lineas.map(({ articulo, cantidad, desglose }, i) => ({
      ventaId: datos.id,
      orden: i + 1,
      productoId: articulo.productoId,
      descripcion: articulo.nombre,
      codigo: articulo.codigo,
      unidad: articulo.unidad,
      cantidad: cantidad.aTexto(),
      precio: articulo.precio.aTexto(),
      tipoDeIva: articulo.iva.tipo,
      tarifaIva: articulo.iva.tarifa,
      base: desglose.base.aTexto(),
      iva: desglose.iva.aTexto(),
      total: desglose.total.aTexto(),
    })),
  };
}

/** Filas → venta. Lo guardado ya cumplió las reglas; una fila que no las cumple es un error de datos y se lanza. */
export function ventaDeFilas(fila: FilaDeVenta, lineas: readonly FilaDeLinea[]): Venta {
  return Venta.guardada({
    id: fila.id,
    huella: fila.huella,
    numero: NumeroDeFactura.de(fila.prefijo, fila.consecutivo),
    clase: claseDeDocumento(fila.clase),
    emitidaEn: fila.emitidaEn,
    comprador: compradorDeColumna(fila.comprador),
    medioDePago: medioDePago(fila.medioDePago),
    creadaPor: fila.creadaPor,
    lineas: [...lineas]
      .sort((a, b) => a.orden - b.orden)
      .map((l) => {
        if (!esTipoDeIva(l.tipoDeIva)) throw new Error(`Línea de la venta ${fila.id} con un IVA que la tabla no admite`);
        return {
          articulo: {
            productoId: l.productoId,
            nombre: l.descripcion,
            codigo: l.codigo,
            unidad: l.unidad,
            precio: Dinero.de(l.precio),
            iva: tratamientoDeIva(l.tipoDeIva, l.tarifaIva),
          },
          cantidad: DecimalExacto.desde(l.cantidad),
          desglose: { base: Dinero.de(l.base), iva: Dinero.de(l.iva), total: Dinero.de(l.total) },
        };
      }),
  });
}
