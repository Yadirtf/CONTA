import { and, eq, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { ColaDeTrabajos, TrabajoDeEnvio } from '../../aplicacion/puertos/cola-de-trabajos.js';
import { colaEnviosDian } from './tablas-envio-dian.js';

/**
 * Bandeja de salida dentro de la transacción de la empresa: el trabajo se confirma junto con el envío.
 * La empresa del trabajo debe ser la de la transacción; se comprueba para no encolar en nombre de otra.
 */
export class ColaDeTrabajosPostgres implements ColaDeTrabajos {
  constructor(private readonly ejecutor: Ejecutor) {}

  async encolar(trabajo: TrabajoDeEnvio, cuando: Date): Promise<void> {
    await this.ejecutor
      .insert(colaEnviosDian)
      .values({ empresaId: this.empresaDe(trabajo), envioId: trabajo.envioId, ejecutarEn: cuando })
      .onConflictDoUpdate({ target: [colaEnviosDian.empresaId, colaEnviosDian.envioId], set: { ejecutarEn: cuando } });
  }

  async completar(trabajo: TrabajoDeEnvio): Promise<void> {
    await this.ejecutor
      .delete(colaEnviosDian)
      .where(and(eq(colaEnviosDian.empresaId, this.empresaDe(trabajo)), eq(colaEnviosDian.envioId, trabajo.envioId)));
  }

  /** Expresión que falla en PostgreSQL si el trabajo no es de la empresa de la transacción. */
  private empresaDe(trabajo: TrabajoDeEnvio) {
    return sql`(CASE WHEN ${trabajo.empresaId.valor}::uuid = conta_sistema.empresa_actual()
                     THEN ${trabajo.empresaId.valor}::uuid
                     ELSE NULL END)`;
  }
}
