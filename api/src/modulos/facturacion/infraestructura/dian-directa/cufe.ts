import { createHash } from 'node:crypto';

/** Campos del CUFE en el orden del anexo técnico 1.9, sección 11.2. Los valores ya vienen como texto del XML. */
export interface CamposCufe {
  /** Prefijo y número: cbc:ID */
  readonly numero: string;
  /** cbc:IssueDate */
  readonly fecha: string;
  /** cbc:IssueTime, con la zona: 10:53:10-05:00 */
  readonly hora: string;
  /** cac:LegalMonetaryTotal/cbc:LineExtensionAmount */
  readonly valorBruto: string;
  /** IVA (tributo 01); 0.00 si no hay */
  readonly iva: string;
  /** Impuesto nacional al consumo (04); 0.00 si no hay */
  readonly inc: string;
  /** ICA (03); 0.00 si no hay */
  readonly ica: string;
  /** cac:LegalMonetaryTotal/cbc:PayableAmount */
  readonly total: string;
  /** NIT del facturador, sin dígito de verificación */
  readonly nitEmisor: string;
  /** Identificación del adquirente, sin dígito de verificación */
  readonly identificacionAdquirente: string;
  /** Clave técnica del rango de numeración (no va en el XML) */
  readonly claveTecnica: string;
  /** cbc:ProfileExecutionID: 1 producción, 2 pruebas */
  readonly ambiente: '1' | '2';
}

/** Cadena del CUFE: NumFac + FecFac + HorFac + ValFac + 01 + ValImp1 + 04 + ValImp2 + 03 + ValImp3 + ValTot + NitFE + NumAdq + ClTec + TipoAmbiente. */
export function cadenaCufe(c: CamposCufe): string {
  return [
    c.numero,
    c.fecha,
    c.hora,
    c.valorBruto,
    '01',
    c.iva,
    '04',
    c.inc,
    '03',
    c.ica,
    c.total,
    c.nitEmisor,
    c.identificacionAdquirente,
    c.claveTecnica,
    c.ambiente,
  ].join('');
}

export function sha384(texto: string): string {
  return createHash('sha384').update(texto, 'utf8').digest('hex');
}

export function calcularCufe(campos: CamposCufe): string {
  return sha384(cadenaCufe(campos));
}

/** SoftwareSecurityCode (anexo 11.8): SHA-384 del id del software, su PIN y el número del documento. */
export function codigoDeSeguridadDelSoftware(idSoftware: string, pin: string, numero: string): string {
  return sha384(`${idSoftware}${pin}${numero}`);
}
