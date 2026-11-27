import { sql } from 'drizzle-orm';
import { IdEmpresa } from '../../../../../compartido/dominio/index.js';
import type { BaseDeDatos } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { EmisionPendiente, FuenteDeEmisionesPendientes } from '../../../aplicacion/puertos/cola-de-emisiones.js';
import { RESERVA_MS } from '../trabajos-vencidos-postgres.js';

/**
 * Toma las emisiones vencidas de todas las empresas y las reserva un rato (SKIP LOCKED), como la cola de envíos. Solo
 * lee ids de conta_sistema; cada emisión se hace después en la transacción de su empresa, donde RLS aplica.
 */
export class EmisionesPendientesPostgres implements FuenteDeEmisionesPendientes {
  constructor(private readonly baseDeDatos: BaseDeDatos) {}

  async tomarVencidas(ahora: Date, limite: number): Promise<EmisionPendiente[]> {
    const reserva = new Date(ahora.getTime() + RESERVA_MS);
    const resultado = await this.baseDeDatos.drizzle().execute<{ empresa_id: string; venta_id: string }>(sql`
      UPDATE conta_sistema.cola_emision_ventas AS c
         SET ejecutar_en = ${reserva.toISOString()}::timestamptz
        FROM (SELECT empresa_id, venta_id FROM conta_sistema.cola_emision_ventas
               WHERE ejecutar_en <= ${ahora.toISOString()}::timestamptz
               ORDER BY ejecutar_en
               LIMIT ${limite}
               FOR UPDATE SKIP LOCKED) AS vencidas
       WHERE c.empresa_id = vencidas.empresa_id AND c.venta_id = vencidas.venta_id
   RETURNING c.empresa_id, c.venta_id`);
    return resultado.rows.map((f) => ({ empresaId: IdEmpresa.de(f.empresa_id), ventaId: f.venta_id }));
  }
}
