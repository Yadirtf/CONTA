import type { ClaseDeDocumento } from '../../../dominio/index.js';

/**
 * Lo que distingue en el XML a cada clase de documento. El resto del UBL es igual: el documento equivalente POS usa
 * la raíz Invoice y las mismas secciones que la factura (anexo del documento equivalente v1.0, Resolución 000165 de
 * 2023, secciones 8.2 y 16; mismo formato que el anexo técnico 1.9 de la factura).
 */
export interface PerfilUbl {
  /** cbc:ProfileID */
  readonly perfil: string;
  /** cbc:InvoiceTypeCode: 01 factura de venta, 20 tiquete de máquina registradora con sistema P.O.S. */
  readonly tipoDeDocumento: string;
  /** cbc:UUID/@schemeName */
  readonly esquemaDelCodigoUnico: 'CUFE-SHA384' | 'CUDE-SHA384';
}

export const PERFILES_UBL: Readonly<Record<ClaseDeDocumento, PerfilUbl>> = {
  factura: { perfil: 'DIAN 2.1: Factura Electrónica de Venta', tipoDeDocumento: '01', esquemaDelCodigoUnico: 'CUFE-SHA384' },
  pos: { perfil: 'DIAN 2.1: Documento Equivalente POS', tipoDeDocumento: '20', esquemaDelCodigoUnico: 'CUDE-SHA384' },
};
