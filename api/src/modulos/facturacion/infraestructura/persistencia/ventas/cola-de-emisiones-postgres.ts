import { and, eq, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { ColaDeEmisiones, FallasDeEmision } from '../../../aplicacion/puertos/cola-de-emisiones.js';
import { colaEmisionVentas } from './tabla-cola-de-emisiones.js';

/**
 * Bandeja de emisiones dentro de la transacción de la empresa: se confirma junto con la venta. La empresa es siempre
 * la de la transacción (conta_sistema.empresa_actual()): la tabla no tiene RLS (ADR-0008), así que cada consulta
 * filtra por ella y no se puede tocar la emisión de otra.
 */
export class ColaDeEmisionesPostgres implements ColaDeEmisiones {
  constructor(private readonly ejecutor: Ejecutor) {}

  async encolar(ventaId: string, cuando: Date): Promise<void> {
    await this.ejecutor
      .insert(colaEmisionVentas)
      .values({ empresaId: sql`conta_sistema.empresa_actual()`, ventaId, ejecutarEn: cuando, intentos: 0 })
      .onConflictDoNothing();
  }

  async completar(ventaId: string): Promise<void> {
    await this.ejecutor.delete(colaEmisionVentas).where(deEstaEmpresa(ventaId));
  }

  async registrarFalla(ventaId: string, codigo: string): Promise<number> {
    const [fila] = await this.ejecutor
      .update(colaEmisionVentas)
      .set({ intentos: sql`${colaEmisionVentas.intentos} + 1`, ultimaFalla: codigo })
      .where(deEstaEmpresa(ventaId))
      .returning({ intentos: colaEmisionVentas.intentos });
    return fila?.intentos ?? 0;
  }

  async reprogramar(ventaId: string, cuando: Date): Promise<void> {
    await this.ejecutor.update(colaEmisionVentas).set({ ejecutarEn: cuando }).where(deEstaEmpresa(ventaId));
  }

  async fallasDe(ventaId: string): Promise<FallasDeEmision | null> {
    const [fila] = await this.ejecutor
      .select({ intentos: colaEmisionVentas.intentos, ultimaFalla: colaEmisionVentas.ultimaFalla })
      .from(colaEmisionVentas)
      .where(deEstaEmpresa(ventaId))
      .limit(1);
    return fila ?? null;
  }
}

const deEstaEmpresa = (ventaId: string) =>
  and(sql`${colaEmisionVentas.empresaId} = conta_sistema.empresa_actual()`, eq(colaEmisionVentas.ventaId, ventaId));
