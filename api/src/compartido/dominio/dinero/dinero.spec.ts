import { ErrorDominio } from '../error-dominio.js';
import { DecimalExacto } from './decimal-exacto.js';
import { Dinero } from './dinero.js';

const cop = (monto: string) => Dinero.de(monto, 'COP');

describe('Dinero', () => {
  it('suma 0.1 + 0.2 y da exactamente 0.3 (criterio de HU-01.04)', () => {
    const suma = cop('0.1').sumar(cop('0.2'));
    expect(suma.esIgualA(cop('0.3'))).toBe(true);
    expect(suma.aTexto()).toBe('0.30');
    expect(suma.monto.aTexto()).toBe('0.3');
  });

  it('acepta hasta 6 decimales de entrada (anexo técnico 1.9, sección 5.5) y rechaza más', () => {
    expect(cop('1105.137').aTexto()).toBe('1105.137');
    expect(cop('0.123456').aTexto()).toBe('0.123456');
    expect(cop('1.5000000').aTexto()).toBe('1.50'); // los ceros a la derecha no cuentan
    expect(() => cop('0.1234567')).toThrow(ErrorDominio);
    try {
      cop('0.1234567');
    } catch (e) {
      expect((e as ErrorDominio).codigo).toBe('dinero.demasiados-decimales');
    }
  });

  it('no mezcla monedas', () => {
    expect(() => cop('1').sumar(Dinero.de('1', 'USD'))).toThrow(/COP y USD/);
    expect(() => cop('1').comparar(Dinero.de('1', 'USD'))).toThrow(ErrorDominio);
    expect(cop('1').esIgualA(Dinero.de('1', 'USD'))).toBe(false);
  });

  it('no acepta number: un 0.1 de JavaScript ya es inexacto', () => {
    expect(() => Dinero.de(0.1 as unknown as string)).toThrow(TypeError);
  });

  it('multiplica precio por cantidad sin redondear y redondea solo cuando se pide', () => {
    const linea = cop('1105.137').multiplicarPor('3.5');
    expect(linea.monto.aTexto()).toBe('3867.9795');
    expect(linea.redondear().aTexto()).toBe('3867.98');
  });

  it('calcula el IVA exacto y lo redondea con mitad al par', () => {
    expect(cop('1000').porcentaje('19').aTexto()).toBe('190.00');
    const iva = cop('105.37').porcentaje('19');
    expect(iva.monto.aTexto()).toBe('20.0203');
    expect(iva.redondear().aTexto()).toBe('20.02');
    // 0.125 queda exactamente en la mitad: mitad al par deja 0.12, no 0.13.
    expect(cop('12.5').porcentaje('1').redondear().aTexto()).toBe('0.12');
  });

  it('redondea con los modos de redondeo', () => {
    const casos: [string, string, string, string][] = [
      // valor, mitad al par (DIAN), mitad lejos de cero, hacia cero
      ['2.5', '2', '3', '2'],
      ['3.5', '4', '4', '3'],
      ['-2.5', '-2', '-3', '-2'],
      ['-3.5', '-4', '-4', '-3'],
      ['2.51', '3', '3', '2'],
      ['2.49', '2', '2', '2'],
      ['-2.51', '-3', '-3', '-2'],
    ];
    for (const [valor, alPar, lejos, haciaCero] of casos) {
      const d = cop(valor);
      expect(d.redondear('mitad-al-par', 0).monto.aTexto(), valor).toBe(alPar);
      expect(d.redondear('mitad-lejos-de-cero', 0).monto.aTexto(), valor).toBe(lejos);
      expect(d.redondear('hacia-cero', 0).monto.aTexto(), valor).toBe(haciaCero);
    }
    expect(cop('0.125').redondear().aTexto()).toBe('0.12');
    expect(cop('0.135').redondear().aTexto()).toBe('0.14');
  });

  it('aproxima al múltiplo de $10 (IVA, anexo técnico 1.9, sección 5.2.1.2)', () => {
    expect(cop('1234').redondearAMultiplo('10').aTexto()).toBe('1230.00');
    expect(cop('1236').redondearAMultiplo('10').aTexto()).toBe('1240.00');
    expect(cop('1235').redondearAMultiplo('10').aTexto()).toBe('1240.00'); // 123.5 → 124 (par)
    expect(cop('1225').redondearAMultiplo('10').aTexto()).toBe('1220.00'); // 122.5 → 122 (par)
    expect(() => cop('1').redondearAMultiplo('0')).toThrow(ErrorDominio);
  });

  it('reparte sin perder ni crear centavos', () => {
    const partes = cop('100').repartir(['1', '1', '1']);
    expect(partes.map((p) => p.aTexto())).toEqual(['33.34', '33.33', '33.33']);
    expect(Dinero.total(partes).esIgualA(cop('100'))).toBe(true);

    const negativas = cop('-0.05').repartir(['1', '1']);
    expect(negativas.map((p) => p.aTexto())).toEqual(['-0.03', '-0.02']);

    expect(cop('10').repartir(['0', '3', '1']).map((p) => p.aTexto())).toEqual(['0.00', '7.50', '2.50']);
    expect(() => cop('10').repartir([])).toThrow(ErrorDominio);
    expect(() => cop('10').repartir(['0'])).toThrow(ErrorDominio);
    expect(() => cop('10').repartir(['-1', '2'])).toThrow(ErrorDominio);
  });

  it('compara contra la tolerancia de ±2.00 de la DIAN', () => {
    const tolerancia = cop('2.00');
    expect(cop('1000').diferenciaDentroDe(cop('1002'), tolerancia)).toBe(true);
    expect(cop('1000').diferenciaDentroDe(cop('997.99'), tolerancia)).toBe(false);
  });

  it('se serializa como texto, nunca como number', () => {
    expect(JSON.stringify({ total: cop('0.3') })).toBe('{"total":{"monto":"0.30","moneda":"COP"}}');
    expect(String(cop('-5'))).toBe('-5.00 COP');
    expect(Dinero.total([])).toEqual(Dinero.cero());
  });
});

describe('DecimalExacto', () => {
  it('rechaza formatos que no son del XML de la DIAN', () => {
    for (const malo of ['', ' 1', '1,5', '1e3', '.5', '5.', '1.2.3', 'NaN', '--1']) {
      expect(() => DecimalExacto.desde(malo), malo).toThrow(RangeError);
    }
    expect(DecimalExacto.desde('+0.50').aTexto()).toBe('0.5');
    expect(DecimalExacto.desde('-0.000').aTexto()).toBe('0');
  });

  it('divide con escala y modo explícitos', () => {
    const uno = DecimalExacto.desde('1');
    expect(uno.dividir(DecimalExacto.desde('3'), 6).aTexto()).toBe('0.333333');
    expect(DecimalExacto.desde('2').dividir(DecimalExacto.desde('3'), 2).aTexto()).toBe('0.67');
    expect(DecimalExacto.desde('-1').dividir(DecimalExacto.desde('8'), 2).aTexto()).toBe('-0.12');
    expect(() => uno.dividir(DecimalExacto.CERO, 2)).toThrow(RangeError);
    expect(() => uno.dividir(uno, -1)).toThrow(RangeError);
  });

  it('exige redondear antes de reducir la escala', () => {
    expect(DecimalExacto.desde('1.25').coeficienteEnEscala(4)).toBe(12500n);
    expect(() => DecimalExacto.desde('1.25').coeficienteEnEscala(1)).toThrow(RangeError);
  });
});
