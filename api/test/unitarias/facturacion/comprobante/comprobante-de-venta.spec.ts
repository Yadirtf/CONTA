import { Dinero, DecimalExacto, Identificacion, Nit } from '../../../../src/compartido/dominio/index.js';
import { cantidad, comprobanteDeVenta, identificacionLegible, pesos } from '../../../../src/modulos/facturacion/dominio/index.js';
import { emisorDePrueba } from '../datos-de-prueba.js';
import { codigoDe } from '../ventas/apoyo.js';
import { CUFE, QR, resolucionDePrueba, ventaDePrueba } from './apoyo.js';

const armar = (cambios: { cufe?: string; codigoQr?: string } = {}) =>
  comprobanteDeVenta({ venta: ventaDePrueba(), emisor: emisorDePrueba(), resolucion: resolucionDePrueba(), cufe: CUFE, codigoQr: QR, ...cambios });

describe('Formato colombiano del comprobante', () => {
  it('escribe pesos con punto de miles y coma decimal', () => {
    expect(pesos(Dinero.de('1234567.89'))).toBe('$ 1.234.567,89');
    expect(pesos(Dinero.de('0'))).toBe('$ 0,00');
    expect(pesos(Dinero.de('-1500.5'))).toBe('$ -1.500,50');
  });

  it('escribe cantidades sin ceros de más', () => {
    expect(cantidad(DecimalExacto.desde('1.500000'))).toBe('1,5');
    expect(cantidad(DecimalExacto.desde('1250'))).toBe('1.250');
  });

  it('muestra el NIT con su dígito y los demás documentos con su nombre', () => {
    expect(identificacionLegible(Identificacion.nit(Nit.de('900373076')))).toBe('NIT 900373076-4');
    expect(identificacionLegible(Identificacion.de('13', '1020304050'))).toBe('Cédula de ciudadanía 1020304050');
  });
});

describe('Comprobante de la venta (HU-06.08)', () => {
  it('lleva número, fecha en hora de Colombia, CUFE, QR y resolución', () => {
    const c = armar();
    expect(c.numero).toBe('SETP990000001');
    expect(c.emitida).toBe('2026-11-27 10:04:05 (hora de Colombia)');
    expect(c.cufe).toBe(CUFE);
    expect(c.codigoQr).toBe(QR);
    expect(c.resolucion).toContain('Resolución DIAN 18760000001 del 2019-01-19 al 2030-01-19');
    expect(c.resolucion).toContain('del SETP990000000 al SETP995000000');
    expect(c.nombreDeArchivo).toBe('factura-SETP990000001.pdf');
    expect(c.pago).toBe('Contado · Transferencia');
  });

  it('distingue gravado, exento y excluido en cada línea', () => {
    expect(armar().lineas.map((l) => l.iva)).toEqual(['IVA 19 %', 'Exento', 'Excluido']);
    expect(armar().lineas[1]?.descripcion).toBe('Huevos x 30 (H-30)');
  });

  it('separa el IVA por tarifa con su base, deja fuera lo excluido y cuadra con la venta', () => {
    const venta = ventaDePrueba();
    const totales = Object.fromEntries(armar().totales);
    expect(totales['Subtotal sin IVA']).toBe(pesos(venta.base));
    expect(totales['IVA 19 % (base $ 6.302,52)']).toBe('$ 1.197,48');
    expect(totales['IVA 0 % (base $ 18.000,00)']).toBe('$ 0,00');
    expect(totales.Total).toBe(pesos(venta.total));
    expect(totales.Total).toBe('$ 30.300,00');
  });

  it('muestra quién vende con sus responsabilidades y quién compra', () => {
    const c = armar();
    expect(c.emisor.identificacion).toBe('NIT 900373076-4');
    expect(c.emisor.detalles).toContain('Responsable de IVA');
    expect(c.emisor.detalles).toContain('Responsabilidades: O-13, O-15');
    expect(c.adquirente.nombre).toBe('Cliente de Prueba S.A.S.');
  });

  it('rechaza un CUFE que no es SHA-384 o un QR de otra factura', () => {
    expect(codigoDe(() => armar({ cufe: 'x' }))).toBe('comprobante.cufe-invalido');
    expect(codigoDe(() => armar({ codigoQr: 'https://otra' }))).toBe('comprobante.qr-invalido');
  });
});
