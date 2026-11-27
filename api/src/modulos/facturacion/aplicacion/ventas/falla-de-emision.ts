import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import { esperaTrasFalla } from '../../dominio/index.js';

/** Tras estas fallas seguidas, la venta se muestra «con demora» aunque se sigue intentando. */
export const FALLAS_PARA_DEMORA = 3;

/**
 * Código de una falla de emisión para guardarlo: el código estable del dominio o el nombre de la clase de error,
 * nunca el mensaje (podría traer datos del certificado o del XML).
 */
export function codigoDeFalla(error: unknown): string {
  const crudo = error instanceof ErrorDominio ? error.codigo : error instanceof Error ? error.name : 'desconocida';
  const limpio = crudo.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64);
  return limpio.length > 0 ? limpio : 'desconocida';
}

/** Cuándo volver a intentar tras `intentos` fallas: 30 s, 1 min, 2 min… hasta 1 hora (como los envíos). */
export function siguienteIntento(ahora: Date, intentos: number): Date {
  return new Date(ahora.getTime() + esperaTrasFalla(intentos));
}
