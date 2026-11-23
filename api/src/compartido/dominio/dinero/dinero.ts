import { ErrorDominio } from '../error-dominio.js';
import { DecimalExacto } from './decimal-exacto.js';
import { REDONDEO_DIAN, type ModoDeRedondeo } from './modo-de-redondeo.js';
import { decimalesDe, type CodigoMoneda } from './moneda.js';

/** Valores que se aceptan como monto o factor: texto decimal ("19.5"), bigint o un DecimalExacto. */
export type ValorDecimal = string | bigint | DecimalExacto;

// Objeto de valor Dinero (HU-01.04, ADR-0005). Inmutable y exacto:
// - las entradas admiten hasta 6 decimales (anexo técnico 1.9 de la DIAN, sección 5.5);
// - sumar, restar, multiplicar y porcentaje nunca redondean: el resultado intermedio es exacto;
// - redondear es siempre explícito, a los decimales de la moneda y con mitad al par por defecto;
// - nunca se mezclan monedas.
export class Dinero {
  /** Máximo de decimales de un monto de entrada (precios unitarios, cantidades por valor). */
  static readonly DECIMALES_MAXIMOS_DE_ENTRADA = 6;

  private constructor(
    readonly monto: DecimalExacto,
    readonly moneda: CodigoMoneda,
  ) {}

  /** Crea un monto: Dinero.de('1105.137', 'COP'). Rechaza number y más de 6 decimales. */
  static de(monto: ValorDecimal, moneda: CodigoMoneda = 'COP'): Dinero {
    decimalesDe(moneda);
    const valor = aDecimal(monto);
    if (valor.decimalesSignificativos() > Dinero.DECIMALES_MAXIMOS_DE_ENTRADA) {
      throw new ErrorDominio(
        'dinero.demasiados-decimales',
        `Un monto admite hasta ${Dinero.DECIMALES_MAXIMOS_DE_ENTRADA} decimales; llegó ${valor.aTexto()}`,
      );
    }
    return new Dinero(valor.normalizado(), moneda);
  }

  static cero(moneda: CodigoMoneda = 'COP'): Dinero {
    return new Dinero(DecimalExacto.CERO, moneda);
  }

  /** Suma exacta de una lista. Con la lista vacía devuelve cero en la moneda dada. */
  static total(montos: readonly Dinero[], moneda: CodigoMoneda = 'COP'): Dinero {
    return montos.reduce((acumulado, monto) => acumulado.sumar(monto), Dinero.cero(moneda));
  }

  sumar(otro: Dinero): Dinero {
    this.exigirMismaMoneda(otro);
    return new Dinero(this.monto.sumar(otro.monto), this.moneda);
  }

  restar(otro: Dinero): Dinero {
    this.exigirMismaMoneda(otro);
    return new Dinero(this.monto.restar(otro.monto), this.moneda);
  }

  /** Producto exacto, sin redondear: precio unitario × cantidad. */
  multiplicarPor(factor: ValorDecimal): Dinero {
    return new Dinero(this.monto.multiplicar(aDecimal(factor)), this.moneda);
  }

  /** Porcentaje exacto, sin redondear: base.porcentaje('19') es el IVA del 19 %. */
  porcentaje(tarifa: ValorDecimal): Dinero {
    const t = aDecimal(tarifa);
    // tarifa / 100 es exacto: el mismo coeficiente con dos decimales más.
    return new Dinero(this.monto.multiplicar(DecimalExacto.deCoeficiente(t.coeficiente, t.escala + 2)), this.moneda);
  }

  /** Redondea a los decimales de la moneda (2 en COP) con el modo de la DIAN, salvo que se pida otro. */
  redondear(modo: ModoDeRedondeo = REDONDEO_DIAN, decimales: number = decimalesDe(this.moneda)): Dinero {
    return new Dinero(this.monto.redondear(decimales, modo), this.moneda);
  }

  /** Aproxima al múltiplo más cercano (por ejemplo, el IVA al múltiplo de $10). */
  redondearAMultiplo(multiplo: ValorDecimal, modo: ModoDeRedondeo = REDONDEO_DIAN): Dinero {
    const paso = aDecimal(multiplo);
    if (paso.esCero() || paso.esNegativo()) {
      throw new ErrorDominio('dinero.multiplo-invalido', `El múltiplo debe ser positivo; llegó ${paso.aTexto()}`);
    }
    const veces = this.monto.dividir(paso, 0, modo);
    return new Dinero(veces.multiplicar(paso), this.moneda);
  }

  /**
   * Reparte el monto redondeado a la moneda en partes proporcionales, sin perder ni crear un centavo:
   * la suma de las partes es exactamente el total redondeado. Los centavos sobrantes van a las partes
   * con mayor residuo y, si empatan, a las primeras (método del mayor residuo).
   */
  repartir(proporciones: readonly ValorDecimal[]): Dinero[] {
    const pesos = proporciones.map(aDecimal);
    if (pesos.length === 0) throw new ErrorDominio('dinero.reparto-vacio', 'No hay partes para repartir');
    if (pesos.some((p) => p.esNegativo())) {
      throw new ErrorDominio('dinero.reparto-negativo', 'Las proporciones no pueden ser negativas');
    }
    const sumaDePesos = pesos.reduce((a, p) => a.sumar(p), DecimalExacto.CERO);
    if (sumaDePesos.esCero()) throw new ErrorDominio('dinero.reparto-vacio', 'Las proporciones suman cero');

    const decimales = decimalesDe(this.moneda);
    const totalEnUnidades = this.monto.redondear(decimales).coeficienteEnEscala(decimales);
    // Escala común para que cada peso sea un entero y la cuenta sea exacta.
    const escala = Math.max(...pesos.map((p) => p.escala));
    const enteros = pesos.map((p) => p.coeficienteEnEscala(escala));
    const sumaEntera = enteros.reduce((a, p) => a + p, 0n);

    const signo = totalEnUnidades < 0n ? -1n : 1n;
    const totalAbs = totalEnUnidades * signo;
    const base = enteros.map((p) => (totalAbs * p) / sumaEntera);
    const residuos = enteros.map((p, i) => ({ i, residuo: totalAbs * p - (base[i] as bigint) * sumaEntera }));
    let sobrante = totalAbs - base.reduce((a, b) => a + b, 0n);
    residuos.sort((x, y) => (x.residuo === y.residuo ? x.i - y.i : x.residuo > y.residuo ? -1 : 1));
    for (const { i } of residuos) {
      if (sobrante === 0n) break;
      base[i] = (base[i] as bigint) + 1n;
      sobrante--;
    }
    return base.map((unidades) => new Dinero(DecimalExacto.deCoeficiente(unidades * signo, decimales).normalizado(), this.moneda));
  }

  /** ¿La diferencia con otro monto está dentro de la tolerancia? (la DIAN admite ±2.00 en montos). */
  diferenciaDentroDe(otro: Dinero, tolerancia: Dinero): boolean {
    this.exigirMismaMoneda(otro);
    this.exigirMismaMoneda(tolerancia);
    return this.monto.restar(otro.monto).abs().comparar(tolerancia.monto.abs()) <= 0;
  }

  negar(): Dinero {
    return new Dinero(this.monto.negar(), this.moneda);
  }

  comparar(otro: Dinero): -1 | 0 | 1 {
    this.exigirMismaMoneda(otro);
    return this.monto.comparar(otro.monto);
  }

  /** Igualdad de valor objeto: mismo monto (0.3 = 0.30) y misma moneda. */
  esIgualA(otro: Dinero): boolean {
    return this.moneda === otro.moneda && this.monto.esIgualA(otro.monto);
  }

  esCero(): boolean {
    return this.monto.esCero();
  }

  esNegativo(): boolean {
    return this.monto.esNegativo();
  }

  /** Texto con al menos los decimales de la moneda: "0.30". No redondea. */
  aTexto(): string {
    return this.monto.aTexto(decimalesDe(this.moneda));
  }

  toString(): string {
    return `${this.aTexto()} ${this.moneda}`;
  }

  toJSON(): { monto: string; moneda: CodigoMoneda } {
    return { monto: this.aTexto(), moneda: this.moneda };
  }

  private exigirMismaMoneda(otro: Dinero): void {
    if (otro.moneda !== this.moneda) {
      throw new ErrorDominio('dinero.monedas-distintas', `No se pueden operar ${this.moneda} y ${otro.moneda} juntos`);
    }
  }
}

function aDecimal(valor: ValorDecimal): DecimalExacto {
  return valor instanceof DecimalExacto ? valor : DecimalExacto.desde(valor);
}
