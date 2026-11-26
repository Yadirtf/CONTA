import { Dinero, esTipoDeIva, type TratamientoDeIva, tratamientoDeIva } from '../../../../compartido/dominio/index.js';
import { esUnidadDeMedida, Producto } from '../../dominio/productos/index.js';
import type { FilaDeProducto, FilaNuevaDeProducto } from './tablas-catalogo.js';

/** Fila → producto. Las restricciones de la tabla ya garantizan la forma; si no, es un error de datos y se lanza. */
export function productoDeFila(fila: FilaDeProducto): Producto {
  if (!esUnidadDeMedida(fila.unidad)) {
    throw new Error(`Producto ${fila.id} con datos que la tabla no debería admitir`);
  }
  return Producto.guardado({
    id: fila.id,
    nombre: fila.nombre,
    codigo: fila.codigo,
    unidad: fila.unidad,
    precio: Dinero.de(fila.precio),
    iva: ivaDeFila(fila),
    creadoEn: fila.creadoEn,
    creadoPor: fila.creadoPor,
  });
}

/**
 * Un IVA que se contradice en la base es un error de datos, no de la petición: se lanza como Error técnico para que
 * el filtro global responda 500 y lo registre, en vez de un 400 que culpa a quien pide (hallazgo H1).
 */
function ivaDeFila(fila: FilaDeProducto): TratamientoDeIva {
  if (!esTipoDeIva(fila.tipoDeIva)) throw new Error(`Producto ${fila.id} con un tipo de IVA que la tabla no debería admitir`);
  try {
    return tratamientoDeIva(fila.tipoDeIva, fila.tarifaIva);
  } catch {
    throw new Error(`Producto ${fila.id} con una tarifa de IVA que la tabla no debería admitir`);
  }
}

/** Producto → fila nueva, sin empresa: el repositorio pone la de la transacción y RLS la comprueba. */
export function filaNuevaDeProducto(producto: Producto): Omit<FilaNuevaDeProducto, 'empresaId'> {
  const { datos } = producto;
  return {
    id: datos.id,
    nombre: datos.nombre,
    nombreBusqueda: producto.nombreParaBuscar,
    codigo: datos.codigo,
    unidad: datos.unidad,
    precio: datos.precio.aTexto(),
    tipoDeIva: datos.iva.tipo,
    tarifaIva: datos.iva.tarifa,
    creadoEn: datos.creadoEn,
    creadoPor: datos.creadoPor,
  };
}
