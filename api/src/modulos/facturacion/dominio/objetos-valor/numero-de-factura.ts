import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Número de una factura: prefijo de la resolución (0 a 4 letras o dígitos) seguido del consecutivo. */
export class NumeroDeFactura {
  private constructor(
    readonly prefijo: string,
    readonly consecutivo: number,
  ) {}

  static de(prefijo: string, consecutivo: number): NumeroDeFactura {
    if (!/^[A-Za-z0-9]{0,4}$/.test(prefijo)) {
      throw new ErrorDominio('factura.prefijo-invalido', 'El prefijo tiene de 0 a 4 letras o dígitos');
    }
    if (!Number.isSafeInteger(consecutivo) || consecutivo < 1) {
      throw new ErrorDominio('factura.consecutivo-invalido', 'El consecutivo es un entero positivo');
    }
    return new NumeroDeFactura(prefijo, consecutivo);
  }

  /** Como va en cbc:ID y en el CUFE: «SETP990000001». */
  aTexto(): string {
    return `${this.prefijo}${this.consecutivo}`;
  }

  toString(): string {
    return this.aTexto();
  }
}
