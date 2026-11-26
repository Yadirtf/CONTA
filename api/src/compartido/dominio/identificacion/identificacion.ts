import { ErrorDominio } from '../error-dominio.js';
import { Nit } from '../nit.js';
import { esTipoDeIdentificacion, TIPO_NIT, type TipoDeIdentificacion } from './tipos-de-identificacion.js';

const NUMERO_SIN_NIT = /^[A-Za-z0-9]{1,20}$/;

/** Documentos colombianos que son solo dígitos: sin letras ni ceros adelante («0123» y «123» serían dos). */
const SOLO_DIGITOS: readonly TipoDeIdentificacion[] = ['12', '13', '22'];
const NUMERO_DE_DIGITOS = /^[1-9]\d{0,19}$/;

/**
 * Identificación de una persona o empresa ante la DIAN. Con NIT lleva dígito de verificación, que siempre se
 * calcula; con los demás tipos, no lleva. La usan facturación (emisor y adquirente) y catálogo (clientes).
 */
export class Identificacion {
  private constructor(
    readonly tipo: TipoDeIdentificacion,
    readonly numero: string,
    readonly digitoVerificacion: number | null,
  ) {}

  static nit(nit: Nit): Identificacion {
    return new Identificacion(TIPO_NIT, nit.numero, nit.digitoVerificacion);
  }

  static de(tipo: TipoDeIdentificacion, numero: string): Identificacion {
    if (!esTipoDeIdentificacion(tipo)) {
      throw new ErrorDominio('identificacion.tipo-invalido', `Tipo de identificación desconocido: ${String(tipo)}`);
    }
    if (tipo === TIPO_NIT) return Identificacion.nit(Nit.de(numero));
    if (!NUMERO_SIN_NIT.test(numero)) {
      throw new ErrorDominio('identificacion.numero-invalido', 'El número de identificación tiene de 1 a 20 letras o dígitos');
    }
    if (SOLO_DIGITOS.includes(tipo) && !NUMERO_DE_DIGITOS.test(numero)) {
      throw new ErrorDominio('identificacion.numero-invalido', 'Ese documento lleva solo dígitos y no empieza por cero');
    }
    return new Identificacion(tipo, numero, null);
  }

  /**
   * Como de(), pero si llega el dígito de verificación escrito por la persona lo compara con el calculado
   * (HU-05.01). Un dígito en un documento que no es NIT también se rechaza: no existe.
   */
  static conDigitoEscrito(tipo: TipoDeIdentificacion, numero: string, digitoEscrito: number | null): Identificacion {
    const identificacion = Identificacion.de(tipo, numero);
    if (digitoEscrito === null) return identificacion;
    if (identificacion.digitoVerificacion === null) {
      throw new ErrorDominio('identificacion.digito-sin-nit', 'Solo el NIT lleva dígito de verificación');
    }
    if (identificacion.digitoVerificacion !== digitoEscrito) {
      throw new ErrorDominio('nit.digito-invalido', 'El dígito de verificación no corresponde a ese NIT. Revisa el número');
    }
    return identificacion;
  }

  esNit(): boolean {
    return this.tipo === TIPO_NIT;
  }

  esIgualA(otra: Identificacion): boolean {
    return this.tipo === otra.tipo && this.numero === otra.numero;
  }
}
