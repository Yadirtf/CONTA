import type { ContextoUsuario } from '../contexto-usuario.js';

/**
 * Transacción del usuario (HU-04.02, ADR-0011). Fija la persona, no una empresa: PostgreSQL solo le deja
 * LEER sus membresías y las empresas a las que pertenece. Ninguna otra tabla de negocio le muestra filas ni
 * acepta escrituras. Para trabajar dentro de una empresa se usa UnidadDeTrabajo con su ContextoEmpresa.
 */
export interface UnidadDeTrabajoDelUsuario<Repositorios> {
  ejecutar<T>(contexto: ContextoUsuario, trabajo: (repositorios: Repositorios) => Promise<T>): Promise<T>;
}
