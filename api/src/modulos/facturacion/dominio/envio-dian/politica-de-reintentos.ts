// Esperas entre intentos con la DIAN: exponenciales con techo. Son puras para probarlas sin reloj.

const SEGUNDO = 1000;

/** Intentos de comunicación con la DIAN antes de declarar el envío fallido. */
export const MAXIMO_DE_INTENTOS = 12;

/** Tras una falla de red o de la DIAN: 30 s, 1 min, 2 min... hasta 1 hora. */
export function esperaTrasFalla(fallasSeguidas: number): number {
  return Math.min(30 * SEGUNDO * 2 ** Math.max(0, fallasSeguidas - 1), 60 * 60 * SEGUNDO);
}

/** Mientras la DIAN valida: 5 s, 10 s, 20 s... hasta 5 minutos. */
export function esperaDeConsulta(consultas: number): number {
  return Math.min(5 * SEGUNDO * 2 ** Math.max(0, consultas - 1), 5 * 60 * SEGUNDO);
}
