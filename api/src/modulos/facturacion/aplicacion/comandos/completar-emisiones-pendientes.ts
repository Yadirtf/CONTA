import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import type { FuenteDeEmisionesPendientes } from '../puertos/cola-de-emisiones.js';
import type { EmitirVenta } from './emitir-venta.js';
import type { ResumenDelLote } from './procesar-trabajos-vencidos.js';

export const LOTE_DE_EMISIONES = 20;

/**
 * Reparador (HU-06.01): termina las emisiones que no se completaron en su petición (la firma falló, la API se
 * reinició). Cada una corre con su empresa; una que falla no detiene el lote y vuelve a la cola cuando vence su reserva.
 */
export class CompletarEmisionesPendientes {
  constructor(
    private readonly fuente: FuenteDeEmisionesPendientes,
    private readonly emitir: Pick<EmitirVenta, 'ejecutar'>,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(limite = LOTE_DE_EMISIONES): Promise<ResumenDelLote> {
    const pendientes = await this.fuente.tomarVencidas(this.reloj.ahora(), limite);
    let conError = 0;
    for (const { empresaId, ventaId } of pendientes) {
      try {
        await this.emitir.ejecutar({ empresaId }, ventaId);
      } catch {
        conError += 1;
      }
    }
    return { tomados: pendientes.length, conError };
  }
}
