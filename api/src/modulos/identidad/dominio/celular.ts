import { ErrorDominio } from '../../../compartido/dominio/index.js';

/** Celular colombiano: 10 dígitos que empiezan por 3. Acepta espacios, guiones, +57 o 57 adelante. */
const MOVIL_COLOMBIANO = /^3\d{9}$/;

/**
 * Número con el que una persona entra a CONTA (HU-04.01). Se guarda en formato E.164 (+573001234567).
 * Es un dato personal (Ley 1581): fuera de la base solo se muestra enmascarado.
 */
export class Celular {
  private constructor(readonly e164: string) {}

  static de(texto: string): Celular {
    const digitos = typeof texto === 'string' ? texto.replace(/[\s().-]/g, '').replace(/^\+?57(?=\d{10}$)/, '') : '';
    if (!MOVIL_COLOMBIANO.test(digitos)) {
      throw new ErrorDominio('acceso.celular-invalido', 'Escribe un celular de Colombia de 10 dígitos, que empiece por 3');
    }
    return new Celular(`+57${digitos}`);
  }

  /** Para registros y pantallas: +57 300 *** 4567. */
  enmascarado(): string {
    return `+57 ${this.e164.slice(3, 6)} *** ${this.e164.slice(-4)}`;
  }

  esIgualA(otro: Celular): boolean {
    return this.e164 === otro.e164;
  }
}
