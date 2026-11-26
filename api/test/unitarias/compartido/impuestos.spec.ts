import fc from 'fast-check';
import {
  DecimalExacto,
  desglosarDesdeBase,
  desglosarDesdeTotal,
  Dinero,
  type ErrorDominio,
  tratamientoDeIva,
  type TratamientoDeIva,
} from '../../../src/compartido/dominio/index.js';

const cop = (monto: string) => Dinero.de(monto);
const iva19 = tratamientoDeIva('gravado', '19');
const iva5 = tratamientoDeIva('gravado', '5');
const exento = tratamientoDeIva('exento', null);
const excluido = tratamientoDeIva('excluido', null);

const codigo = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as ErrorDominio).codigo;
  }
  return undefined;
};

describe('tratamiento de IVA (HU-05.02)', () => {
  it('gravado lleva 19 o 5; exento es 0 %; excluido no tiene tarifa', () => {
    expect(iva19).toEqual({ tipo: 'gravado', tarifa: '19' });
    expect(iva5).toEqual({ tipo: 'gravado', tarifa: '5' });
    expect(exento).toEqual({ tipo: 'exento', tarifa: '0' });
    expect(tratamientoDeIva('exento', '0')).toEqual(exento);
    expect(excluido).toEqual({ tipo: 'excluido', tarifa: null });
  });

  it('rechaza tarifas que no existen o que se contradicen con el tipo', () => {
    for (const [tipo, tarifa] of [
      ['gravado', null],
      ['gravado', '0'],
      ['gravado', '16'],
      ['gravado', '19.0'],
      ['exento', '19'],
      ['excluido', '0'],
      ['excluido', '5'],
    ] as const) {
      expect(codigo(() => tratamientoDeIva(tipo, tarifa)), `${tipo} ${tarifa}`).toBe('iva.tarifa-invalida');
    }
  });
});

describe('desglose del IVA incluido (criterio de HU-05.02)', () => {
  it('un producto de $10.000 con IVA 19 % incluido: base 8.403,36 e IVA 1.596,64', () => {
    const { base, iva, total } = desglosarDesdeTotal(cop('10000'), iva19);
    expect([base.aTexto(), iva.aTexto(), total.aTexto()]).toEqual(['8403.36', '1596.64', '10000.00']);
  });

  it('con IVA 5 %: $2.100 → base 2.000 e IVA 100', () => {
    const { base, iva } = desglosarDesdeTotal(cop('2100'), iva5);
    expect([base.aTexto(), iva.aTexto()]).toEqual(['2000.00', '100.00']);
  });

  it('exentos y excluidos no cobran IVA: la base es todo el precio', () => {
    for (const tratamiento of [exento, excluido]) {
      const { base, iva, total } = desglosarDesdeTotal(cop('4500'), tratamiento);
      expect([base.aTexto(), iva.aTexto(), total.aTexto()]).toEqual(['4500.00', '0.00', '4500.00']);
    }
  });

  it('redondea la base una sola vez, mitad al par: 1.19 → base 1.00; 0.01 → base 0.01 e IVA 0', () => {
    expect(desglosarDesdeTotal(cop('1.19'), iva19).base.aTexto()).toBe('1.00');
    const centavo = desglosarDesdeTotal(cop('0.01'), iva19);
    expect([centavo.base.aTexto(), centavo.iva.aTexto()]).toEqual(['0.01', '0.00']);
  });

  it('desde una base sin IVA: el IVA es base × tarifa redondeado y el total, la suma', () => {
    const { iva, total } = desglosarDesdeBase(cop('8403.36'), iva19);
    expect([iva.aTexto(), total.aTexto()]).toEqual(['1596.64', '10000.00']);
    expect(desglosarDesdeBase(cop('100'), excluido).total.aTexto()).toBe('100.00');
  });

  // Propiedad: para cualquier total en centavos, base + IVA es exactamente el total y el IVA difiere de
  // base × tarifa en menos de un centavo (≤ 0,006), dentro de la tolerancia de la DIAN.
  it.each([
    ['19 %', iva19, '0.19'],
    ['5 %', iva5, '0.05'],
  ] as [string, TratamientoDeIva, string][])('base + IVA = total, exacto, para cualquier total (%s)', (_, tratamiento, tasa) => {
    const tope = DecimalExacto.desde('0.006');
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 100_000_000_000n }), (centavos) => {
        const total = Dinero.de(DecimalExacto.deCoeficiente(centavos, 2));
        const { base, iva } = desglosarDesdeTotal(total, tratamiento);
        expect(base.sumar(iva).esIgualA(total)).toBe(true);
        expect(base.monto.decimalesSignificativos()).toBeLessThanOrEqual(2);
        expect(iva.esNegativo()).toBe(false);
        const diferencia = iva.monto.restar(base.monto.multiplicar(DecimalExacto.desde(tasa))).abs();
        expect(diferencia.comparar(tope)).toBeLessThanOrEqual(0);
      }),
      { numRuns: 2000 },
    );
  });
});
