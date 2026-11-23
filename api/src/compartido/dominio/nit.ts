import { ErrorDominio } from './error-dominio.js';

// Pesos del dígito de verificación de la DIAN (módulo 11), aplicados de derecha a izquierda.
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/** NIT colombiano sin puntos ni guiones. El dígito de verificación se calcula; nunca se recibe. */
export class Nit {
  private constructor(
    readonly numero: string,
    readonly digitoVerificacion: number,
  ) {}

  /** Nit.de('800197268') → 800197268-4. Rechaza puntos, guiones, ceros a la izquierda y más de 15 dígitos. */
  static de(numero: string): Nit {
    if (!/^[1-9]\d{2,14}$/.test(numero)) {
      throw new ErrorDominio('nit.invalido', 'El NIT tiene de 3 a 15 dígitos, sin puntos, guiones ni dígito de verificación');
    }
    return new Nit(numero, Nit.digitoDe(numero));
  }

  static digitoDe(numero: string): number {
    let suma = 0;
    [...numero].reverse().forEach((digito, i) => {
      suma += Number(digito) * (PESOS[i] as number);
    });
    const residuo = suma % 11;
    return residuo < 2 ? residuo : 11 - residuo;
  }

  esIgualA(otro: Nit): boolean {
    return this.numero === otro.numero;
  }

  toString(): string {
    return `${this.numero}-${this.digitoVerificacion}`;
  }
}
