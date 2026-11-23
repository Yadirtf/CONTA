import type { ContextoEmpresa } from '../contexto-empresa.js';

/**
 * Única puerta a la base de datos (HU-01.05, ADR-0006). Abre una transacción, fija en ella la empresa
 * del contexto y entrega los repositorios atados a esa transacción. Todo lo que hace `trabajo` ve y
 * escribe solo datos de esa empresa: PostgreSQL lo impone con Row Level Security.
 * Si `trabajo` lanza, la transacción se deshace.
 */
export interface UnidadDeTrabajo<Repositorios> {
  ejecutar<T>(contexto: ContextoEmpresa, trabajo: (repositorios: Repositorios) => Promise<T>): Promise<T>;
}
