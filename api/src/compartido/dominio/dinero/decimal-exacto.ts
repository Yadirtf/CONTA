import { dividirEnterosRedondeando, REDONDEO_DIAN, type ModoDeRedondeo } from './modo-de-redondeo.js';

// Número decimal exacto: coeficiente entero (bigint) × 10^-escala (HU-01.04, ADR-0005).
// Suma, resta y multiplicación nunca pierden precisión. Solo la división y el redondeo cambian el valor,
// y siempre con una escala y un modo explícitos. Nunca se construye desde un number: un 0.1 de JavaScript
// ya es inexacto antes de llegar aquí.
const FORMATO = /^([+-])?(\d+)(?:\.(\d+))?$/;
const ESCALA_MAXIMA = 1000;

export class DecimalExacto {
  static readonly CERO = new DecimalExacto(0n, 0);
  static readonly UNO = new DecimalExacto(1n, 0);

  private constructor(
    /** Entero sin escala: 12.345 tiene coeficiente 12345 y escala 3. */
    readonly coeficiente: bigint,
    /** Cantidad de decimales del coeficiente; siempre entera y ≥ 0. */
    readonly escala: number,
  ) {}

  /**
   * Crea un decimal desde texto con punto decimal ("1105.137", "-0.5") o desde un entero bigint.
   * Rechaza number, comas, notación científica y espacios: el formato de entrada es el del XML de la DIAN.
   */
  static desde(valor: string | bigint): DecimalExacto {
    if (typeof valor === 'bigint') return new DecimalExacto(valor, 0);
    if (typeof valor !== 'string') {
      throw new TypeError('DecimalExacto solo acepta texto o bigint; un number ya perdió precisión');
    }
    const partes = FORMATO.exec(valor);
    if (!partes) throw new RangeError(`"${valor}" no es un decimal válido (use dígitos y punto, como 1105.137)`);
    const [, signo, enteros = '0', decimales = ''] = partes;
    if (decimales.length > ESCALA_MAXIMA) throw new RangeError(`"${valor}" tiene demasiados decimales`);
    const coeficiente = BigInt(enteros + decimales);
    return new DecimalExacto(signo === '-' ? -coeficiente : coeficiente, decimales.length);
  }

  /** Crea el decimal coeficiente × 10^-escala. */
  static deCoeficiente(coeficiente: bigint, escala: number): DecimalExacto {
    if (!Number.isInteger(escala) || escala < 0 || escala > ESCALA_MAXIMA) {
      throw new RangeError(`Escala inválida: ${escala}`);
    }
    return new DecimalExacto(coeficiente, escala);
  }

  sumar(otro: DecimalExacto): DecimalExacto {
    const escala = Math.max(this.escala, otro.escala);
    return new DecimalExacto(this.aEscalaExacta(escala) + otro.aEscalaExacta(escala), escala).normalizado();
  }

  restar(otro: DecimalExacto): DecimalExacto {
    return this.sumar(otro.negar());
  }

  multiplicar(otro: DecimalExacto): DecimalExacto {
    return DecimalExacto.deCoeficiente(this.coeficiente * otro.coeficiente, this.escala + otro.escala).normalizado();
  }

  /** División con resultado en la escala dada y redondeado con el modo dado (por defecto, el de la DIAN). */
  dividir(divisor: DecimalExacto, escala: number, modo: ModoDeRedondeo = REDONDEO_DIAN): DecimalExacto {
    if (divisor.esCero()) throw new RangeError('División por cero');
    DecimalExacto.deCoeficiente(0n, escala); // valida la escala
    // (a·10^-sa) / (b·10^-sb) con resultado c·10^-escala  →  c = a·10^(sb + escala) / (b·10^sa)
    const dividendo = this.coeficiente * potencia(divisor.escala + escala);
    const divisorEntero = divisor.coeficiente * potencia(this.escala);
    return new DecimalExacto(dividirEnterosRedondeando(dividendo, divisorEntero, modo), escala).normalizado();
  }

  /** Redondea a `escala` decimales. Si ya tiene esa escala o menos, devuelve el mismo valor. */
  redondear(escala: number, modo: ModoDeRedondeo = REDONDEO_DIAN): DecimalExacto {
    DecimalExacto.deCoeficiente(0n, escala);
    if (this.escala <= escala) return this;
    const coeficiente = dividirEnterosRedondeando(this.coeficiente, potencia(this.escala - escala), modo);
    return new DecimalExacto(coeficiente, escala).normalizado();
  }

  negar(): DecimalExacto {
    return new DecimalExacto(-this.coeficiente, this.escala);
  }

  abs(): DecimalExacto {
    return this.esNegativo() ? this.negar() : this;
  }

  comparar(otro: DecimalExacto): -1 | 0 | 1 {
    const escala = Math.max(this.escala, otro.escala);
    const a = this.aEscalaExacta(escala);
    const b = otro.aEscalaExacta(escala);
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /** Igualdad de valor: 0.30 y 0.3 son iguales. */
  esIgualA(otro: DecimalExacto): boolean {
    return this.comparar(otro) === 0;
  }

  esCero(): boolean {
    return this.coeficiente === 0n;
  }

  esNegativo(): boolean {
    return this.coeficiente < 0n;
  }

  /** Decimales significativos (sin ceros a la derecha): 1.50 tiene 1. */
  decimalesSignificativos(): number {
    return this.normalizado().escala;
  }

  /** Mismo valor sin ceros sobrantes a la derecha: 1.500 → 1.5. Evita que la escala crezca sin límite. */
  normalizado(): DecimalExacto {
    let coeficiente = this.coeficiente;
    let escala = this.escala;
    while (escala > 0 && coeficiente % 10n === 0n) {
      coeficiente /= 10n;
      escala--;
    }
    return escala === this.escala ? this : new DecimalExacto(coeficiente, escala);
  }

  /**
   * Texto con punto decimal y al menos `decimalesMinimos` decimales ("0.30" con 2).
   * Nunca redondea: si hacen falta menos decimales, primero se llama a redondear().
   */
  aTexto(decimalesMinimos = 0): string {
    const normal = this.normalizado();
    const escala = Math.max(normal.escala, decimalesMinimos);
    const coeficiente = normal.aEscalaExacta(escala);
    const negativo = coeficiente < 0n;
    const digitos = (negativo ? -coeficiente : coeficiente).toString().padStart(escala + 1, '0');
    const enteros = digitos.slice(0, digitos.length - escala);
    const decimales = digitos.slice(digitos.length - escala);
    return `${negativo ? '-' : ''}${enteros}${escala > 0 ? `.${decimales}` : ''}`;
  }

  toString(): string {
    return this.aTexto();
  }

  /** Evita que JSON.stringify convierta el valor en un objeto sin sentido o en un number. */
  toJSON(): string {
    return this.aTexto();
  }

  /**
   * Coeficiente entero del valor expresado con `escala` decimales: 1.5 en escala 2 es 150.
   * Falla si la escala no alcanza para el valor exacto (eso exigiría redondear antes).
   */
  coeficienteEnEscala(escala: number): bigint {
    const normal = this.normalizado();
    if (escala < normal.escala) throw new RangeError('Reducir la escala exige redondear');
    return normal.coeficiente * potencia(escala - normal.escala);
  }

  private aEscalaExacta(escala: number): bigint {
    if (escala < this.escala) throw new RangeError('Reducir la escala exige redondear');
    return this.coeficiente * potencia(escala - this.escala);
  }
}

function potencia(exponente: number): bigint {
  return 10n ** BigInt(exponente);
}
