import type { FuenteDeCorreosPendientes } from '../puertos/repositorio-de-correos.js';
import type { EnviarCorreoDeFactura } from './enviar-correo-de-factura.js';
import type { ResumenDelLote } from './procesar-trabajos-vencidos.js';

export const LOTE_DE_CORREOS = 10;

/**
 * HU-06.08: envía los correos de factura que ya toca mandar, de todas las empresas, cada uno con su empresa. Lo
 * llaman el despertador y el endpoint interno. Uno que falla no detiene el lote: su reserva vence y se retoma.
 */
export class EnviarCorreosPendientes {
  constructor(
    private readonly fuente: FuenteDeCorreosPendientes,
    private readonly enviar: Pick<EnviarCorreoDeFactura, 'ejecutar'>,
  ) {}

  async ejecutar(limite = LOTE_DE_CORREOS): Promise<ResumenDelLote> {
    const pendientes = await this.fuente.tomarVencidos(limite);
    let conError = 0;
    for (const { empresaId, ventaId } of pendientes) {
      try {
        await this.enviar.ejecutar({ empresaId }, ventaId);
      } catch {
        conError += 1;
      }
    }
    return { tomados: pendientes.length, conError };
  }
}
