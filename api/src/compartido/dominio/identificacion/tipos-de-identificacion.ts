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

export const TIPO_NIT = '31' satisfies TipoDeIdentificacion;

export function esTipoDeIdentificacion(valor: unknown): valor is TipoDeIdentificacion {
  return typeof valor === 'string' && Object.hasOwn(TIPOS_DE_IDENTIFICACION, valor);
}
