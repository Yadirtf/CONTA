import { emisorDePrueba } from '../datos-de-prueba.js';
import { codigoDe } from '../ventas/apoyo.js';
import { resolucionPos, ventaPos } from './datos-pos.js';
import { ResolucionDeNumeracion } from '../../../../src/modulos/facturacion/dominio/index.js';

// HU-06.02: la venta con tiquete POS y el documento que sale de ella.

describe('Venta con tiquete POS', () => {
  it('sale un documento de clase pos con su caja, armada siempre igual desde la venta', () => {
    const documento = ventaPos().aFactura(emisorDePrueba(), resolucionPos());
    expect(documento.clase).toBe('pos');
    expect(documento.puntoDeVenta).toEqual({
      placa: 'CONTA-APP',
      ubicacion: 'Calle 1 # 2-3, Bogotá, D.C.',
      cajero: 'Usuario bbbbbbbb',
      tipo: 'Celular con la app CONTA',
      codigoDeVenta: 'EPOS7',
    });
    expect(ventaPos().aFactura(emisorDePrueba(), resolucionPos())).toEqual(documento);
  });

  it('no se registra una venta POS por encima de 5 UVT sin impuestos', () => {
    // 124 gaseosas: base 260.504,20, dentro del tope. 125: base 262.605,04, se pasa.
    expect(ventaPos('124').base.aTexto()).toBe('260504.20');
    expect(codigoDe(() => ventaPos('125'))).toBe('pos.tope-excedido');
  });

  it('una venta POS no se arma con una resolución de factura (ni al revés)', () => {
    const deFactura = ResolucionDeNumeracion.crear({
      numero: '18760000001',
      prefijo: 'EPOS',
      desde: 1,
      hasta: 1000,
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2027-12-31',
    });
    expect(deFactura.clase).toBe('factura');
    expect(codigoDe(() => ventaPos().aFactura(emisorDePrueba(), deFactura))).toBe('venta.resolucion-de-otra-clase');
  });
});
