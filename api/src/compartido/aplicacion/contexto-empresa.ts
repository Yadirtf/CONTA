import type { IdEmpresa } from '../dominio/index.js';

/**
 * Empresa en cuyo nombre corre un caso de uso (HU-01.05, ADR-0006). Viaja explícito, como parámetro,
 * desde la presentación hasta la unidad de trabajo: nunca en una variable global ni en AsyncLocalStorage.
 */
export interface ContextoEmpresa {
  readonly empresaId: IdEmpresa;
}
