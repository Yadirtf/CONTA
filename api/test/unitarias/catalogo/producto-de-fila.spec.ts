import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { productoDeFila } from '../../../src/modulos/catalogo/infraestructura/persistencia/producto-de-fila.js';
import type { FilaDeProducto } from '../../../src/modulos/catalogo/infraestructura/persistencia/tablas-catalogo.js';
import { AHORA, CAJERO } from './datos-de-prueba.js';

const fila = (cambios: Partial<FilaDeProducto> = {}): FilaDeProducto => ({
  empresaId: '5a0c8f1e-6b2d-4e8f-9a1b-3c4d5e6f7a8b',
  id: '0b7d1a52-5f8c-4c39-9f43-2a8e7f1c0d22',
  nombre: 'Gaseosa',
  nombreBusqueda: 'gaseosa',
  codigo: null,
  unidad: '94',
  precio: '2500.00',
  tipoDeIva: 'gravado',
  tarifaIva: '19',
  creadoEn: AHORA,
  creadoPor: CAJERO,
  ...cambios,
});

describe('producto desde su fila', () => {
  it('reconstruye el producto con su IVA', () => {
    expect(productoDeFila(fila()).datos.iva).toEqual({ tipo: 'gravado', tarifa: '19' });
  });

  it('H1: un IVA que se contradice es un error de datos (500), no un ErrorDominio que culpa a la petición', () => {
    for (const mala of [fila({ tarifaIva: null }), fila({ tipoDeIva: 'otro' }), fila({ unidad: 'XX' })]) {
      let lanzado: unknown;
      try {
        productoDeFila(mala);
      } catch (e) {
        lanzado = e;
      }
      expect(lanzado).toBeInstanceOf(Error);
      expect(lanzado).not.toBeInstanceOf(ErrorDominio);
    }
  });
});
