import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import type { FuenteDeTrabajosVencidos } from '../puertos/cola-de-trabajos.js';
import type { ProcesarEnvioDian } from './procesar-envio-dian.js';

export const LOTE_POR_DEFECTO = 20;

export interface ResumenDelLote {
  readonly tomados: number;
  readonly conError: number;
}

/**
 * Procesa los trabajos vencidos de todas las empresas, uno por uno y cada uno con su empresa. Lo llaman
 * el despertador en proceso y, para recuperar lo que se perdió al reiniciar, el endpoint interno.
 * Un trabajo que falla no detiene el lote: su reserva vence y se vuelve a tomar.
 */
export class ProcesarTrabajosVencidos {
  constructor(
    private readonly fuente: FuenteDeTrabajosVencidos,
    private readonly procesar: Pick<ProcesarEnvioDian, 'ejecutar'>,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(limite = LOTE_POR_DEFECTO): Promise<ResumenDelLote> {
    const trabajos = await this.fuente.tomarVencidos(this.reloj.ahora(), limite);
    let conError = 0;
    for (const trabajo of trabajos) {
      try {
        await this.procesar.ejecutar(trabajo);
      } catch {
        conError += 1;
      }
    }
    return { tomados: trabajos.length, conError };
  }
}
