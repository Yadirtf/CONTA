import { sql } from 'drizzle-orm';
import { IdEmpresa } from '../../../../../compartido/dominio/index.js';
import type { BaseDeDatos } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { CorreoPendiente, FuenteDeCorreosPendientes } from '../../../aplicacion/puertos/repositorio-de-correos.js';

/**
 * Toma los correos vencidos de todas las empresas con conta_sistema.tomar_correos_vencidos, que solo entrega ids y
 * los reserva dos minutos con la hora de la base. Cada correo se manda después en la transacción de su empresa.
 */
export class CorreosPendientesPostgres implements FuenteDeCorreosPendientes {
  constructor(private readonly baseDeDatos: BaseDeDatos) {}

  async tomarVencidos(limite: number): Promise<CorreoPendiente[]> {
    const resultado = await this.baseDeDatos
      .drizzle()
      .execute<{ empresa_id: string; venta_id: string }>(sql`SELECT empresa_id, venta_id FROM conta_sistema.tomar_correos_vencidos(${limite})`);
    return resultado.rows.map((f) => ({ empresaId: IdEmpresa.de(f.empresa_id), ventaId: f.venta_id }));
  }
}
