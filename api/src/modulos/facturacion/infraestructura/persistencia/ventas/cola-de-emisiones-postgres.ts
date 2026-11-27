import { eq, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { ColaDeEmisiones } from '../../../aplicacion/puertos/cola-de-emisiones.js';
import { colaEmisionVentas } from './tabla-cola-de-emisiones.js';

/**
 * Bandeja de emisiones dentro de la transacción de la empresa: se confirma junto con la venta. La empresa es siempre
 * la de la transacción (conta_sistema.empresa_actual()), así que no se puede encolar en nombre de otra.
 */
export class ColaDeEmisionesPostgres implements ColaDeEmisiones {
  constructor(private readonly ejecutor: Ejecutor) {}

  async encolar(ventaId: string, cuando: Date): Promise<void> {
    await this.ejecutor
      .insert(colaEmisionVentas)
      .values({ empresaId: sql`conta_sistema.empresa_actual()`, ventaId, ejecutarEn: cuando })
      .onConflictDoNothing();
  }

  async completar(ventaId: string): Promise<void> {
    await this.ejecutor
      .delete(colaEmisionVentas)
      .where(sql`${colaEmisionVentas.empresaId} = conta_sistema.empresa_actual() and ${eq(colaEmisionVentas.ventaId, ventaId)}`);
  }
}
