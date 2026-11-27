import { Dinero, ErrorDominio, tratamientoDeIva } from '../../../../src/compartido/dominio/index.js';
import type { ArticuloDelCatalogo } from '../../../../src/modulos/facturacion/dominio/index.js';

// Datos de prueba de las ventas: artículos como los entrega el catálogo y un lector de códigos de error.

export const PRODUCTO_GRAVADO = '11111111-1111-4111-8111-111111111111';
export const PRODUCTO_EXCLUIDO = '22222222-2222-4222-8222-222222222222';

export const gaseosa = (): ArticuloDelCatalogo => ({
  productoId: PRODUCTO_GRAVADO,
  nombre: 'Gaseosa 400 ml',
  codigo: null,
  unidad: '94',
  precio: Dinero.de('2500'),
  iva: tratamientoDeIva('gravado', '19'),
});

export const arroz = (): ArticuloDelCatalogo => ({
  productoId: PRODUCTO_EXCLUIDO,
  nombre: 'Arroz 500 g',
  codigo: 'A-1',
  unidad: '94',
  precio: Dinero.de('3200'),
  iva: tratamientoDeIva('excluido', null),
});

export function codigoDe(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return e instanceof ErrorDominio ? e.codigo : 'otro';
  }
  return 'ninguno';
}

export async function codigoDeAsync(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return e instanceof ErrorDominio ? e.codigo : String(e);
  }
  return 'ninguno';
}
