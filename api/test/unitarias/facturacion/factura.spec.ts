import { Dinero, ErrorDominio } from '../../../src/compartido/dominio/index.js';
import {
  Factura,
  Identificacion,
  LineaDeFactura,
  MomentoDeEmision,
  NumeroDeFactura,
  ResolucionDeNumeracion,
  tarifaIva,
} from '../../../src/modulos/facturacion/dominio/index.js';
import { adquirenteDePrueba, emisorDePrueba, facturaConDosLineas } from './datos-de-prueba.js';

const codigo = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErrorDominio) return e.codigo;
    throw e;
  }
  return 'sin error';
};

const resolucion = ResolucionDeNumeracion.crear({
  numero: '18760000001',
  prefijo: 'SETP',
  desde: 1,
  hasta: 100,
  vigenteDesde: '2026-01-01',
  vigenteHasta: '2026-12-31',
});

const datos = (cambios: Partial<Parameters<typeof Factura.emitir>[0]> = {}) => ({
  numero: NumeroDeFactura.de('SETP', 10),
  emision: MomentoDeEmision.desde(new Date('2026-06-01T12:00:00Z')),
  resolucion,
  emisor: emisorDePrueba(),
  adquirente: adquirenteDePrueba(),
  lineas: [LineaDeFactura.crear({ descripcion: 'Tornillo', cantidad: '1', precioUnitario: Dinero.de('100'), tarifaIva: '19' })],
  formaDePago: { metodo: 'contado' as const, medio: '10', vence: null },
  ...cambios,
});

describe('Factura', () => {
  it('suma los totales desde las líneas y agrupa el IVA por tarifa', () => {
    const f = facturaConDosLineas();
    expect(f.totalBruto.aTexto()).toBe('47537.01');
    expect(f.totalIva.aTexto()).toBe('7037.03');
    expect(f.total.aTexto()).toBe('54574.04');
    expect(f.subtotalesIva.map((s) => [s.tarifa, s.base.aTexto(), s.valor.aTexto()])).toEqual([
      ['0', '10500.00', '0.00'],
      ['19', '37037.01', '7037.03'],
    ]);
  });

  it('redondea cada línea a 2 decimales con mitad al par', () => {
    // 0.125 → 0.12 (al par), 0.135 → 0.14; IVA 19 % de 10.50 = 1.995 → 2.00
    expect(LineaDeFactura.crear({ descripcion: 'x', cantidad: '1', precioUnitario: Dinero.de('0.125'), tarifaIva: '0' }).valor.aTexto()).toBe('0.12');
    expect(LineaDeFactura.crear({ descripcion: 'x', cantidad: '1', precioUnitario: Dinero.de('0.135'), tarifaIva: '0' }).valor.aTexto()).toBe('0.14');
    expect(LineaDeFactura.crear({ descripcion: 'x', cantidad: '1', precioUnitario: Dinero.de('10.50'), tarifaIva: '19' }).iva.aTexto()).toBe('2.00');
  });

  it('solo emite con la resolución: mismo prefijo, número en el rango y fecha vigente', () => {
    expect(codigo(() => Factura.emitir(datos()))).toBe('sin error');
    expect(codigo(() => Factura.emitir(datos({ numero: NumeroDeFactura.de('FE', 10) })))).toBe('factura.prefijo-no-autorizado');
    expect(codigo(() => Factura.emitir(datos({ numero: NumeroDeFactura.de('SETP', 101) })))).toBe('factura.fuera-de-rango');
    expect(codigo(() => Factura.emitir(datos({ emision: MomentoDeEmision.desde(new Date('2027-01-01T05:00:00Z')) })))).toBe(
      'factura.resolucion-vencida',
    );
  });

  it('exige NIT y dirección al emisor, al menos una línea y vencimiento a crédito', () => {
    const sinNit = { ...emisorDePrueba(), identificacion: Identificacion.de('13', '1020304050') };
    expect(codigo(() => Factura.emitir(datos({ emisor: sinNit })))).toBe('factura.emisor-sin-nit');
    expect(codigo(() => Factura.emitir(datos({ emisor: { ...emisorDePrueba(), direccion: null } })))).toBe('factura.emisor-sin-direccion');
    expect(codigo(() => Factura.emitir(datos({ lineas: [] })))).toBe('factura.sin-lineas');
    expect(codigo(() => Factura.emitir(datos({ formaDePago: { metodo: 'credito', medio: '10', vence: null } })))).toBe(
      'factura.vencimiento-invalido',
    );
    expect(codigo(() => Factura.emitir(datos({ formaDePago: { metodo: 'credito', medio: '10', vence: '2026-05-31' } })))).toBe(
      'factura.vencimiento-invalido',
    );
  });

  it('rechaza líneas inválidas y tarifas de IVA no vigentes', () => {
    const linea = (cambios: object) => () =>
      LineaDeFactura.crear({ descripcion: 'x', cantidad: '1', precioUnitario: Dinero.de('1'), tarifaIva: '19', ...cambios });
    expect(codigo(linea({ cantidad: '0' }))).toBe('factura.cantidad-invalida');
    expect(codigo(linea({ cantidad: '1.0000001' }))).toBe('factura.cantidad-invalida');
    expect(codigo(linea({ precioUnitario: Dinero.de('-1') }))).toBe('factura.precio-invalido');
    expect(codigo(linea({ descripcion: '  ' }))).toBe('factura.descripcion-invalida');
    expect(codigo(linea({ unidad: 'unidad' }))).toBe('factura.unidad-invalida');
    expect(codigo(() => tarifaIva('16'))).toBe('factura.tarifa-iva-invalida');
  });
});

describe('MomentoDeEmision', () => {
  it('usa la hora legal de Colombia (UTC-05:00), también al cruzar la medianoche', () => {
    const m = MomentoDeEmision.desde(new Date('2026-01-01T03:15:09Z'));
    expect([m.fecha, m.hora]).toEqual(['2025-12-31', '22:15:09-05:00']);
    expect(codigo(() => MomentoDeEmision.desde(new Date('no es fecha')))).toBe('factura.fecha-invalida');
  });
});

describe('NumeroDeFactura, Identificacion y ResolucionDeNumeracion', () => {
  it('validan sus formatos', () => {
    expect(NumeroDeFactura.de('SETP', 990000001).aTexto()).toBe('SETP990000001');
    expect(codigo(() => NumeroDeFactura.de('SETPX', 1))).toBe('factura.prefijo-invalido');
    expect(codigo(() => NumeroDeFactura.de('SETP', 0))).toBe('factura.consecutivo-invalido');
    expect(Identificacion.de('31', '800197268').digitoVerificacion).toBe(4);
    expect(Identificacion.de('13', '1020304050').digitoVerificacion).toBeNull();
    expect(codigo(() => Identificacion.de('13', '10.203.040'))).toBe('identificacion.numero-invalido');
    expect(codigo(() => ResolucionDeNumeracion.crear({ numero: '1', prefijo: '', desde: 5, hasta: 4, vigenteDesde: '2026-01-01', vigenteHasta: '2026-12-31' }))).toBe(
      'resolucion.rango-invalido',
    );
    expect(codigo(() => ResolucionDeNumeracion.crear({ numero: '1', prefijo: '', desde: 1, hasta: 4, vigenteDesde: '2026-02-30', vigenteHasta: '2026-12-31' }))).toBe(
      'resolucion.vigencia-invalida',
    );
  });
});
