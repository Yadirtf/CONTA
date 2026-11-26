import { sql } from 'drizzle-orm';
import type { ContextoUsuario, UnidadDeTrabajoDelUsuario } from '../../aplicacion/index.js';
import type { BaseDeDatos, Ejecutor } from './base-de-datos.js';

/**
 * Transacción del usuario sobre PostgreSQL (HU-04.02, ADR-0011). Llama a conta_sistema.fijar_usuario(id), que
 * equivale a SET LOCAL y aborta si la conexión ya traía usuario o empresa: una transacción nunca es de los dos.
 * Al terminar, PostgreSQL olvida el usuario y la conexión vuelve limpia al pool.
 */
export class UnidadDeTrabajoDelUsuarioPostgres<Repositorios> implements UnidadDeTrabajoDelUsuario<Repositorios> {
  constructor(
    private readonly baseDeDatos: BaseDeDatos,
    private readonly crearRepositorios: (ejecutor: Ejecutor) => Repositorios,
  ) {}

  ejecutar<T>(contexto: ContextoUsuario, trabajo: (repositorios: Repositorios) => Promise<T>): Promise<T> {
    return this.baseDeDatos.drizzle().transaction(async (tx) => {
      await tx.execute(sql`select conta_sistema.fijar_usuario(${contexto.usuarioId.valor}::uuid)`);
      return trabajo(this.crearRepositorios(tx));
    });
  }
}
