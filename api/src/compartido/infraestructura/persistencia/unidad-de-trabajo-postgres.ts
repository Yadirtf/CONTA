import { sql } from 'drizzle-orm';
import type { ContextoEmpresa, UnidadDeTrabajo } from '../../aplicacion/index.js';
import type { BaseDeDatos, Ejecutor } from './base-de-datos.js';

/**
 * Unidad de trabajo sobre PostgreSQL (HU-01.05, ADR-0006). Cada llamada:
 * 1. abre una transacción (compatible con el pooler de Neon en modo transacción);
 * 2. fija la empresa con conta_sistema.fijar_empresa(id), que equivale a SET LOCAL y aborta si la conexión
 *    ya traía una empresa de sesión;
 * 3. entrega a `trabajo` los repositorios creados sobre esa transacción.
 * Al terminar, PostgreSQL olvida la empresa sola: la conexión vuelve limpia al pool.
 */
export class UnidadDeTrabajoPostgres<Repositorios> implements UnidadDeTrabajo<Repositorios> {
  constructor(
    private readonly baseDeDatos: BaseDeDatos,
    private readonly crearRepositorios: (ejecutor: Ejecutor) => Repositorios,
  ) {}

  ejecutar<T>(contexto: ContextoEmpresa, trabajo: (repositorios: Repositorios) => Promise<T>): Promise<T> {
    return this.baseDeDatos.drizzle().transaction(async (tx) => {
      await tx.execute(sql`select conta_sistema.fijar_empresa(${contexto.empresaId.valor}::uuid)`);
      return trabajo(this.crearRepositorios(tx));
    });
  }
}
