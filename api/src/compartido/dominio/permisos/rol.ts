/**
 * Papel de una persona dentro de una empresa (HU-04.03, ADR-0012). Va en la membresía: la misma persona
 * puede ser dueña de su negocio y contadora de otros. El rol decide qué puede hacer; el modo, solo qué ve.
 * El rol «soporte» del plan no es de una empresa: es de la consola y llega con su propia historia.
 */
export const ROLES = ['dueno', 'contador', 'cajero'] as const;

export type Rol = (typeof ROLES)[number];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}
