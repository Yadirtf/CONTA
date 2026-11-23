import { ErrorDominio } from '../../../../compartido/dominio/index.js';

// Colombia no tiene horario de verano: la hora legal es siempre UTC-05:00.
const DESFASE_COLOMBIA_MS = -5 * 60 * 60 * 1000;

/** Fecha y hora de emisión en hora legal de Colombia, como las pide el anexo técnico (sección 5.4). */
export class MomentoDeEmision {
  private constructor(
    /** AAAA-MM-DD */
    readonly fecha: string,
    /** hh:mm:ss-05:00 */
    readonly hora: string,
  ) {}

  static desde(instante: Date): MomentoDeEmision {
    if (Number.isNaN(instante.getTime())) {
      throw new ErrorDominio('factura.fecha-invalida', 'La fecha de emisión no es válida');
    }
    const local = new Date(instante.getTime() + DESFASE_COLOMBIA_MS).toISOString();
    return new MomentoDeEmision(local.slice(0, 10), `${local.slice(11, 19)}-05:00`);
  }
}
