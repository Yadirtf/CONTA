// Errores de la firma. Sus mensajes son fijos y no llevan `cause`: el error original de la librería
// podría contener partes del certificado, de la llave o de la contraseña.

/** El .p12 no se puede usar: contraseña errónea, archivo dañado, certificado vencido o sin uso de firma. */
export class CertificadoNoUtilizable extends Error {
  constructor(readonly motivo: MotivoCertificadoNoUtilizable) {
    super(MENSAJES[motivo]);
    this.name = 'CertificadoNoUtilizable';
  }
}

export type MotivoCertificadoNoUtilizable =
  | 'ilegible'
  | 'sin-llave'
  | 'fuera-de-vigencia'
  | 'sin-uso-de-firma'
  | 'algoritmo';

const MENSAJES: Record<MotivoCertificadoNoUtilizable, string> = {
  ilegible: 'El certificado de firma no se pudo abrir: revise el archivo y la contraseña',
  'sin-llave': 'El certificado de firma no trae una llave privada que corresponda al certificado',
  'fuera-de-vigencia': 'El certificado de firma no está vigente en la fecha de la firma',
  'sin-uso-de-firma': 'El certificado no está habilitado para firma digital y no repudio',
  algoritmo: 'El certificado de firma debe ser RSA de al menos 2048 bits',
};

/** El XML no tiene la forma que el firmador espera (una sola factura UBL, sin firma previa ni DTD). */
export class DocumentoNoFirmable extends Error {
  constructor(motivo: string) {
    super(`El documento no se puede firmar: ${motivo}`);
    this.name = 'DocumentoNoFirmable';
  }
}
