import type { Modo } from './modo.js';
import type { Rol } from './rol.js';

/**
 * Quién debe pasar el segundo factor para trabajar en una empresa (HU-04.04, ADR-0013): el rol contador y
 * cualquiera en modo contador. Se mira el modo también porque un dueño en modo contador ve lo mismo que un
 * contador (ADR-0012). Se decide por membresía, en cada petición: un cambio de rol o de modo vale enseguida.
 */
export function exigeSegundoFactor(rol: Rol, modo: Modo): boolean {
  return rol === 'contador' || modo === 'contador';
}
