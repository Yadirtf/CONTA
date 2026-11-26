import type { DatosDeProductoNuevo } from '../../../src/modulos/catalogo/dominio/productos/index.js';
import { idNuevo } from './datos-de-prueba.js';

/** Gaseosa de $2.500 con IVA 19 % incluido, como la crea el dueño en el mostrador. */
export const gaseosa = (cambios: Partial<DatosDeProductoNuevo> = {}): DatosDeProductoNuevo => ({
  id: idNuevo(),
  nombre: 'Gaseosa 400 ml',
  codigo: '7702004003508',
  unidad: null,
  precio: '2500',
  precioIncluyeIva: true,
  tipoDeIva: 'gravado',
  tarifaIva: '19',
  ...cambios,
});

/** Arroz: excluido de IVA (ET art. 424). */
export const arroz = (cambios: Partial<DatosDeProductoNuevo> = {}): DatosDeProductoNuevo => ({
  id: idNuevo(),
  nombre: 'Arroz x 5 kg',
  codigo: null,
  unidad: null,
  precio: '18000',
  precioIncluyeIva: true,
  tipoDeIva: 'excluido',
  tarifaIva: null,
  ...cambios,
});
