/** SQLSTATE y restricción de un error de pg, que Drizzle envuelve en `cause`. */
export function errorDePostgres(error: unknown): { codigo?: string; restriccion?: string } {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const codigo = 'code' in e && typeof e.code === 'string' ? e.code : undefined;
    const restriccion = 'constraint' in e && typeof e.constraint === 'string' ? e.constraint : undefined;
    if (codigo) return { codigo, restriccion };
  }
  return {};
}

export const VIOLACION_DE_UNICIDAD = '23505';
export const VIOLACION_DE_EXCLUSION = '23P01';
export const VIOLACION_DE_CHECK = '23514';
