import { sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { PreferenciasDeFacturacion } from '../../../aplicacion/puertos/preferencias-de-facturacion.js';
import { preferenciasDeFacturacion } from './tablas-configuracion.js';

const EMPRESA = sql`conta_sistema.empresa_actual()`;

/** Preferencias de la empresa de la transacción (RLS). Sin fila, «siempre factura» está apagado. */
export class PreferenciasPostgres implements PreferenciasDeFacturacion {
  constructor(private readonly ejecutor: Ejecutor) {}

  async siempreFactura(): Promise<boolean> {
    const [fila] = await this.ejecutor.select({ siempre: preferenciasDeFacturacion.siempreFactura }).from(preferenciasDeFacturacion).limit(1);
    return fila?.siempre ?? false;
  }

  async guardar(siempreFactura: boolean, usuarioId: string): Promise<void> {
    const columnas = { siempreFactura, actualizadoEn: sql`now()`, actualizadoPor: usuarioId };
    await this.ejecutor
      .insert(preferenciasDeFacturacion)
      .values({ empresaId: EMPRESA, ...columnas })
      .onConflictDoUpdate({ target: preferenciasDeFacturacion.empresaId, set: columnas });
  }
}
