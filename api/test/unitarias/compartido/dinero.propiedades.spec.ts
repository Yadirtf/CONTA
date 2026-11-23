import fc from 'fast-check';
import { DecimalExacto, Dinero, type ModoDeRedondeo } from '../../../src/compartido/dominio/index.js';

// Pruebas de propiedad de Dinero y DecimalExacto (HU-01.04, ADR-0005). Cada propiedad corre con
// cientos de valores al azar; si una falla, fast-check muestra el caso mínimo que la rompe.
// Fuente de las reglas: anexo técnico 1.9 de la DIAN, secciones 5.2.1 (mitad al par, NTC 3711),
// 5.2.1.1 (tolerancia ±2.00) y 5.5 (hasta 6 decimales).

const LIMITE = 10n ** 15n; // billones de pesos con 6 decimales: más que cualquier factura real
const decimal = (escalaMaxima = 6) =>
  fc
    .tuple(fc.bigInt({ min: -LIMITE, max: LIMITE }), fc.integer({ min: 0, max: escalaMaxima }))
    .map(([c, e]) => DecimalExacto.deCoeficiente(c, e));
const dinero = decimal().map((d) => Dinero.de(d, 'COP'));
const modo = fc.constantFrom<ModoDeRedondeo>('mitad-al-par', 'mitad-lejos-de-cero', 'hacia-cero');
const igual = (a: DecimalExacto, b: DecimalExacto) => a.esIgualA(b);

describe('propiedades de DecimalExacto', () => {
  it('la suma es conmutativa y asociativa, y cero es neutro', () => {
    fc.assert(
      fc.property(decimal(), decimal(), decimal(), (a, b, c) => {
        expect(igual(a.sumar(b), b.sumar(a))).toBe(true);
        expect(igual(a.sumar(b).sumar(c), a.sumar(b.sumar(c)))).toBe(true);
        expect(igual(a.sumar(DecimalExacto.CERO), a)).toBe(true);
      }),
    );
  });

  it('restar deshace sumar, sin residuo', () => {
    fc.assert(
      fc.property(decimal(), decimal(), (a, b) => {
        expect(igual(a.sumar(b).restar(b), a)).toBe(true);
        expect(a.restar(a).esCero()).toBe(true);
      }),
    );
  });

  it('la multiplicación es exacta y distributiva', () => {
    fc.assert(
      fc.property(decimal(), decimal(), decimal(), (a, b, c) => {
        expect(igual(a.multiplicar(b.sumar(c)), a.multiplicar(b).sumar(a.multiplicar(c)))).toBe(true);
        expect(igual(a.multiplicar(b), b.multiplicar(a))).toBe(true);
      }),
    );
  });

  it('el texto vuelve al mismo valor', () => {
    fc.assert(
      fc.property(decimal(12), (a) => {
        expect(igual(DecimalExacto.desde(a.aTexto()), a)).toBe(true);
      }),
    );
  });

  it('redondear es idempotente y no se aleja más de media unidad', () => {
    fc.assert(
      fc.property(decimal(12), fc.integer({ min: 0, max: 6 }), modo, (x, escala, m) => {
        const r = x.redondear(escala, m);
        expect(igual(r.redondear(escala, m), r)).toBe(true);
        expect(r.decimalesSignificativos()).toBeLessThanOrEqual(escala);
        const unidad = DecimalExacto.deCoeficiente(1n, escala);
        const distancia = x.restar(r).abs();
        if (m === 'hacia-cero') {
          expect(distancia.comparar(unidad)).toBe(-1);
          expect(r.abs().comparar(x.abs())).toBeLessThanOrEqual(0);
        } else {
          expect(distancia.multiplicar(DecimalExacto.desde(2n)).comparar(unidad)).toBeLessThanOrEqual(0);
        }
      }),
    );
  });

  it('mitad al par: en un empate exacto el último dígito queda par (NTC 3711)', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -LIMITE, max: LIMITE }), fc.integer({ min: 0, max: 6 }), (k, escala) => {
        // x = (k + 0.5) · 10^-escala está exactamente en la mitad entre k y k+1 (en unidades de la escala).
        const x = DecimalExacto.deCoeficiente(k * 10n + 5n, escala + 1);
        const r = x.redondear(escala, 'mitad-al-par');
        const ultimo = r.coeficienteEnEscala(escala);
        expect(ultimo % 2n).toBe(0n);
        expect(x.restar(r).abs().esIgualA(DecimalExacto.deCoeficiente(5n, escala + 1))).toBe(true);
      }),
    );
  });

  it('dividir y volver a multiplicar se aleja como mucho media unidad de la escala pedida', () => {
    fc.assert(
      fc.property(decimal(), decimal().filter((d) => !d.esCero()), fc.integer({ min: 0, max: 8 }), (a, b, escala) => {
        const q = a.dividir(b, escala);
        // |q - a/b| ≤ 0.5·10^-escala  ⇔  |q·b - a| ≤ 0.5·10^-escala·|b|
        const error = q.multiplicar(b).restar(a).abs().multiplicar(DecimalExacto.desde(2n));
        expect(error.comparar(DecimalExacto.deCoeficiente(1n, escala).multiplicar(b.abs()))).toBeLessThanOrEqual(0);
      }),
    );
  });
});

describe('propiedades de Dinero', () => {
  it('repartir conserva el total redondeado y nadie se aleja un centavo o más de su parte exacta', () => {
    const proporciones = fc.array(decimal(3).map((d) => d.abs()), { minLength: 1, maxLength: 12 });
    fc.assert(
      fc.property(dinero, proporciones, (monto, pesos) => {
        fc.pre(pesos.some((p) => !p.esCero()));
        const partes = monto.repartir(pesos);
        const total = monto.redondear();
        expect(partes).toHaveLength(pesos.length);
        expect(Dinero.total(partes).esIgualA(total)).toBe(true);
        const sumaDePesos = pesos.reduce((a, p) => a.sumar(p), DecimalExacto.CERO);
        partes.forEach((parte, i) => {
          const exacta = total.monto.multiplicar(pesos[i] as DecimalExacto).dividir(sumaDePesos, 12);
          expect(parte.monto.restar(exacta).abs().comparar(DecimalExacto.desde('0.01'))).toBe(-1);
        });
      }),
    );
  });

  it('redondear línea por línea queda dentro de la tolerancia ±2.00 de la DIAN hasta 400 líneas', () => {
    const linea = fc.tuple(dinero.map((d) => Dinero.de(d.monto.abs())), decimal(6).map((c) => c.abs()));
    fc.assert(
      fc.property(fc.array(linea, { minLength: 1, maxLength: 400 }), (lineas) => {
        const exactas = lineas.map(([precio, cantidad]) => precio.multiplicarPor(cantidad));
        const porLinea = Dinero.total(exactas.map((l) => l.redondear()));
        const totalRedondeado = Dinero.total(exactas).redondear();
        expect(porLinea.diferenciaDentroDe(totalRedondeado, Dinero.de('2.00'))).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it('el IVA aproximado al múltiplo de $10 queda dentro de ±$5 (anexo técnico 1.9, sección 5.2.1.2)', () => {
    fc.assert(
      fc.property(dinero, fc.constantFrom('19', '5', '0'), (base, tarifa) => {
        const iva = base.porcentaje(tarifa);
        const aproximado = iva.redondearAMultiplo('10');
        expect(aproximado.diferenciaDentroDe(iva, Dinero.de('5'))).toBe(true);
        expect(aproximado.monto.coeficienteEnEscala(0) % 10n).toBe(0n);
      }),
    );
  });

  it('nunca mezcla monedas', () => {
    fc.assert(
      fc.property(dinero, fc.constantFrom<'USD' | 'EUR'>('USD', 'EUR'), (cop, otra) => {
        expect(() => cop.sumar(Dinero.de(cop.monto, otra))).toThrow(/monedas|juntos/);
      }),
    );
  });
});

describe('rendimiento de Dinero', () => {
  it('una factura de 10 000 líneas con IVA se calcula en menos de 1 segundo', () => {
    const inicio = performance.now();
    let total = Dinero.cero();
    let iva = Dinero.cero();
    for (let i = 1; i <= 10_000; i++) {
      const linea = Dinero.de(`${i}.123456`).multiplicarPor(`${i % 7}.25`);
      total = total.sumar(linea.redondear());
      iva = iva.sumar(linea.porcentaje('19').redondear());
    }
    const duracion = performance.now() - inicio;
    expect(total.esNegativo()).toBe(false);
    expect(iva.monto.decimalesSignificativos()).toBeLessThanOrEqual(2);
    expect(duracion).toBeLessThan(1000);
  });
});
