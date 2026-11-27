import { codigoDianDe, estadoDeLaVenta, lineaDeVenta, medioDePago, pedidoDeVenta, textoCanonicoDe } from '../../../../src/modulos/facturacion/dominio/index.js';
import { arroz, codigoDe, gaseosa, PRODUCTO_EXCLUIDO, PRODUCTO_GRAVADO } from './apoyo.js';

// HU-06.01: la forma del pedido que manda la app y cada línea calculada con el precio del catálogo.

const ID = 'abcdef33-3333-4333-8333-333333333333';
const datos = (cambios: Partial<Parameters<typeof pedidoDeVenta>[0]> = {}) => ({
  id: ID,
  lineas: [{ productoId: PRODUCTO_GRAVADO, cantidad: '2' }],
  compradorId: null,
  medioDePago: 'efectivo',
  ...cambios,
});

describe('Pedido de venta (HU-06.01)', () => {
  it('acepta un pedido válido', () => {
    expect(pedidoDeVenta(datos()).medioDePago).toBe('efectivo');
  });

  it('rechaza ids que no son UUID en minúsculas, líneas vacías, repetidas o de más', () => {
    expect(codigoDe(() => pedidoDeVenta(datos({ id: ID.toUpperCase() })))).toBe('venta.id-invalido');
    expect(codigoDe(() => pedidoDeVenta(datos({ lineas: [] })))).toBe('venta.lineas-invalidas');
    const muchas = Array.from({ length: 101 }, (_, i) => ({ productoId: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`, cantidad: '1' }));
    expect(codigoDe(() => pedidoDeVenta(datos({ lineas: muchas })))).toBe('venta.lineas-invalidas');
    const repetida = [{ productoId: PRODUCTO_GRAVADO, cantidad: '1' }, { productoId: PRODUCTO_GRAVADO, cantidad: '2' }];
    expect(codigoDe(() => pedidoDeVenta(datos({ lineas: repetida })))).toBe('venta.producto-repetido');
    expect(codigoDe(() => pedidoDeVenta(datos({ lineas: [{ productoId: "1' OR '1'='1", cantidad: '1' }] })))).toBe('venta.producto-invalido');
    expect(codigoDe(() => pedidoDeVenta(datos({ compradorId: 'otro' })))).toBe('venta.comprador-invalido');
  });

  it('solo acepta los medios de pago conocidos y los traduce al código de la DIAN', () => {
    expect(codigoDe(() => medioDePago('fiado'))).toBe('venta.medio-de-pago-invalido');
    expect(codigoDe(() => medioDePago(10))).toBe('venta.medio-de-pago-invalido');
    expect(['efectivo', 'tarjeta-debito', 'tarjeta-credito', 'transferencia'].map((m) => codigoDianDe(medioDePago(m)))).toEqual(['10', '49', '48', '47']);
  });

  it('el texto canónico cambia si cambia cualquier cosa del pedido', () => {
    const base = textoCanonicoDe(pedidoDeVenta(datos()));
    expect(textoCanonicoDe(pedidoDeVenta(datos()))).toBe(base);
    expect(textoCanonicoDe(pedidoDeVenta(datos({ medioDePago: 'transferencia' })))).not.toBe(base);
    expect(textoCanonicoDe(pedidoDeVenta(datos({ lineas: [{ productoId: PRODUCTO_EXCLUIDO, cantidad: '2' }] })))).not.toBe(base);
  });
});

describe('Línea de venta (HU-06.01)', () => {
  it('cobra el precio con IVA por la cantidad y separa la base y el IVA', () => {
    const { desglose } = lineaDeVenta(gaseosa(), '3');
    expect([desglose.total.aTexto(), desglose.base.aTexto(), desglose.iva.aTexto()]).toEqual(['7500.00', '6302.52', '1197.48']);
    expect(lineaDeVenta(arroz(), '1.5').desglose.iva.esCero()).toBe(true);
  });

  it('rechaza cantidades en cero, negativas, con notación rara o enormes', () => {
    for (const cantidad of ['0', '-1', '1e3', '1,5', '0.0000001', '1000001', ' 1', '']) {
      expect(codigoDe(() => lineaDeVenta(gaseosa(), cantidad))).toBe('venta.cantidad-invalida');
    }
  });

  it('rechaza una cantidad que no alcanza a valer un centavo', () => {
    expect(codigoDe(() => lineaDeVenta(gaseosa(), '0.000001'))).toBe('venta.cantidad-invalida');
  });

  it('rechaza una línea que pasa del total máximo', () => {
    expect(codigoDe(() => lineaDeVenta(gaseosa(), '1000000'))).toBe('venta.total-excedido');
  });
});

describe('Estado de la venta (HU-06.01)', () => {
  it('solo es aceptada o rechazada si la DIAN respondió; lo demás está pendiente', () => {
    expect(estadoDeLaVenta('aceptado')).toBe('aceptada');
    expect(estadoDeLaVenta('rechazado')).toBe('rechazada');
    expect(estadoDeLaVenta(null)).toBe('pendiente');
    expect(estadoDeLaVenta('pendiente')).toBe('pendiente');
  });
});
