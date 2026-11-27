import type { FuenteDeCorreosPendientes } from '../puertos/repositorio-de-correos.js';
import type { EnviarCorreoDeFactura } from './enviar-correo-de-factura.js';
import type { ResumenDelLote } from './procesar-trabajos-vencidos.js';

export const LOTE_DE_CORREOS = 10;

export interface FallaDelLote {
  readonly empresaId: string;
  readonly ventaId: string;
  readonly tipo: string;
}

/**
 * HU-06.08: envía los correos de factura que ya toca mandar, de todas las empresas, cada uno con su empresa. Lo
 * llaman el despertador y el endpoint interno. Uno que falla no detiene el lote: se retoma cuando vence la espera de su intento.
 */
export class EnviarCorreosPendientes {
  constructor(
    private readonly fuente: FuenteDeCorreosPendientes,
    private readonly enviar: Pick<EnviarCorreoDeFactura, 'ejecutar'>,
    /** Sin proveedor configurado los correos esperan en la cola sin gastar intentos (hallazgo H5). */
    private readonly activo = true,
    /** Deja rastro de un correo que no pudo dar su paso (hallazgo H2). Solo ids y el tipo de error, nunca datos. */
    private readonly alFallar: (falla: FallaDelLote) => void = () => undefined,
  ) {}

  async ejecutar(limite = LOTE_DE_CORREOS): Promise<ResumenDelLote> {
    if (!this.activo) return { tomados: 0, conError: 0 };
    const pendientes = await this.fuente.tomarVencidos(limite);
    let conError = 0;
    for (const { empresaId, ventaId } of pendientes) {
      try {
        await this.enviar.ejecutar({ empresaId }, ventaId);
      } catch (error) {
        conError += 1;
        this.alFallar({ empresaId: empresaId.valor, ventaId, tipo: error instanceof Error ? error.name : 'desconocido' });
      }
    }
    return { tomados: pendientes.length, conError };
  }
}
