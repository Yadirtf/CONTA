import { sql } from 'drizzle-orm';
import { IdEmpresa } from '../../../../compartido/dominio/index.js';
import type { BaseDeDatos } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { FuenteDeTrabajosVencidos, TrabajoDeEnvio } from '../../aplicacion/puertos/cola-de-trabajos.js';

/** Tiempo que un trabajo tomado queda reservado. Si el proceso muere, vuelve a estar disponible después. */
export const RESERVA_MS = 5 * 60 * 1000;

/**
 * Toma los trabajos vencidos de todas las empresas. No fija empresa: solo lee ids de conta_sistema, sin RLS
 * porque ahí no hay datos de negocio. Mueve su hora a `ahora + RESERVA` en la misma sentencia (SKIP LOCKED),
 * así dos procesadores nunca toman el mismo trabajo a la vez.
 */
export class TrabajosVencidosPostgres implements FuenteDeTrabajosVencidos {
  constructor(private readonly baseDeDatos: BaseDeDatos) {}

  async tomarVencidos(ahora: Date, limite: number): Promise<TrabajoDeEnvio[]> {
    const reserva = new Date(ahora.getTime() + RESERVA_MS);
    const resultado = await this.baseDeDatos.drizzle().execute<{ empresa_id: string; envio_id: string }>(sql`
      UPDATE conta_sistema.cola_envios_dian AS c
         SET ejecutar_en = ${reserva.toISOString()}::timestamptz
        FROM (SELECT empresa_id, envio_id FROM conta_sistema.cola_envios_dian
               WHERE ejecutar_en <= ${ahora.toISOString()}::timestamptz
               ORDER BY ejecutar_en
               LIMIT ${limite}
               FOR UPDATE SKIP LOCKED) AS vencidos
       WHERE c.empresa_id = vencidos.empresa_id AND c.envio_id = vencidos.envio_id
   RETURNING c.empresa_id, c.envio_id`);
    return resultado.rows.map((f) => ({ empresaId: IdEmpresa.de(f.empresa_id), envioId: f.envio_id }));
  }
}
