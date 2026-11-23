import { ErrorDominio, Nit } from '../../../../compartido/dominio/index.js';

/**
 * Tipos de documento de identificación de la DIAN, en el código que va en el XML (schemeName).
 * Lista tomada del esquema oficial DIAN_UBL_Structures.xsd (tipo coID2Type).
 */
export const TIPOS_DE_IDENTIFICACION = {
  '11': 'Registro civil',
  '12': 'Tarjeta de identidad',
  '13': 'Cédula de ciudadanía',
  '21': 'Tarjeta de extranjería',
  '22': 'Cédula de extranjería',
  '31': 'NIT',
  '41': 'Pasaporte',
  '42': 'Documento de identificación extranjero',
  '50': 'NIT de otro país',
  '91': 'NUIP',
} as const;

export type TipoDeIdentificacion = keyof typeof TIPOS_DE_IDENTIFICACION;

/** Identificación de una persona o empresa. Con NIT lleva dígito de verificación; con los demás tipos, no. */
export class Identificacion {
  private constructor(
    readonly tipo: TipoDeIdentificacion,
    readonly numero: string,
    readonly digitoVerificacion: number | null,
  ) {}

  static nit(nit: Nit): Identificacion {
    return new Identificacion('31', nit.numero, nit.digitoVerificacion);
  }

  static de(tipo: TipoDeIdentificacion, numero: string): Identificacion {
    if (!(tipo in TIPOS_DE_IDENTIFICACION)) {
      throw new ErrorDominio('identificacion.tipo-invalido', `Tipo de identificación desconocido: ${String(tipo)}`);
    }
    if (tipo === '31') return Identificacion.nit(Nit.de(numero));
    if (!/^[A-Za-z0-9]{1,20}$/.test(numero)) {
      throw new ErrorDominio('identificacion.numero-invalido', 'El número de identificación tiene de 1 a 20 letras o dígitos');
    }
    return new Identificacion(tipo, numero, null);
  }

  esNit(): boolean {
    return this.tipo === '31';
  }
}
