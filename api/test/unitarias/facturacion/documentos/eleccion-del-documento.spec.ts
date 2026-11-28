import fc from 'fast-check';
import { Dinero } from '../../../../src/compartido/dominio/index.js';
import {
  cabeEnPos,
  claseDeDocumento,
  claseParaLaVenta,
  type CircunstanciasDeLaVenta,
  preferenciaDeDocumento,
  topeDelPos,
  uvtDe,
} from '../../../../src/modulos/facturacion/dominio/index.js';
import { codigoDe } from '../ventas/apoyo.js';

// HU-06.02: qué documento sale de una venta y el tope de 5 UVT del tiquete POS (ET 616-1, parágrafo 2).

const TOPE_2026 = '261870.00'; // 5 × $52.374

const circunstancias = (cambios: Partial<CircunstanciasDeLaVenta> = {}): CircunstanciasDeLaVenta => ({
  preferencia: 'automatico',
  conComprador: false,
  base: Dinero.de('10000'),
  fecha: '2026-11-27',
  posDisponible: true,
  siempreFactura: false,
  ...cambios,
});

describe('Tope del tiquete POS', () => {
  it('es 5 UVT de 2026 ($261.870) y una base igual al tope cabe', () => {
    expect(uvtDe('2026-01-01')?.aTexto()).toBe('52374.00');
    expect(topeDelPos('2026-12-31')?.aTexto()).toBe(TOPE_2026);
    expect(cabeEnPos(Dinero.de(TOPE_2026), '2026-11-27')).toBe(true);
    expect(cabeEnPos(Dinero.de('261870.01'), '2026-11-27')).toBe(false);
  });

  it('un año sin UVT publicada usa la última conocida (nunca un tope mayor que el real)', () => {
    expect(topeDelPos('2027-01-01')?.aTexto()).toBe(TOPE_2026);
  });

  it('antes de la primera UVT de la tabla no hay tope: no cabe nada', () => {
    expect(uvtDe('2025-12-31')).toBeNull();
    expect(cabeEnPos(Dinero.de('1'), '2025-12-31')).toBe(false);
  });

  it('propiedad: cabe si y solo si la base es menor o igual que el tope', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 100_000_000n }), (centavos) => {
        const base = Dinero.de(`${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`);
        return cabeEnPos(base, '2026-06-01') === centavos <= 26_187_000n;
      }),
    );
  });
});

describe('Elección del documento', () => {
  it('en automático, a consumidor final, habilitado y dentro del tope: tiquete POS', () => {
    expect(claseParaLaVenta(circunstancias())).toBe('pos');
    expect(claseParaLaVenta(circunstancias({ base: Dinero.de(TOPE_2026) }))).toBe('pos');
  });

  it('en cualquier otro caso: factura electrónica', () => {
    expect(claseParaLaVenta(circunstancias({ preferencia: 'factura' }))).toBe('factura');
    expect(claseParaLaVenta(circunstancias({ conComprador: true }))).toBe('factura');
    expect(claseParaLaVenta(circunstancias({ posDisponible: false }))).toBe('factura');
    // HU-07.04: el dueño pidió «siempre factura».
    expect(claseParaLaVenta(circunstancias({ siempreFactura: true }))).toBe('factura');
    expect(claseParaLaVenta(circunstancias({ base: Dinero.de('261870.01') }))).toBe('factura');
    expect(claseParaLaVenta(circunstancias({ fecha: '2025-12-31' }))).toBe('factura');
  });

  it('la preferencia y la clase solo admiten sus valores', () => {
    expect(preferenciaDeDocumento('factura')).toBe('factura');
    expect(codigoDe(() => preferenciaDeDocumento('pos'))).toBe('venta.documento-invalido');
    expect(codigoDe(() => preferenciaDeDocumento('FACTURA'))).toBe('venta.documento-invalido');
    expect(claseDeDocumento('pos')).toBe('pos');
    expect(codigoDe(() => claseDeDocumento('nota'))).toBe('documento.clase-invalida');
  });
});
