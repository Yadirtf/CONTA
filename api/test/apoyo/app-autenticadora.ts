import { codigoDelPaso, pasoDe } from '../../src/modulos/identidad/infraestructura/segundo-factor/totp.js';

// Apoyo de las pruebas del segundo factor: hace de app autenticadora a partir de la clave en base32.

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function deBase32(texto: string): Buffer {
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const letra of texto) {
    valor = (valor << 5) | ALFABETO.indexOf(letra);
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Código que mostraría la app autenticadora con esa clave en ese instante (o desplazado en pasos de 30 s). */
export const codigoDeLaApp = (claveBase32: string, ahora: Date, desplazamiento = 0): string =>
  codigoDelPaso(deBase32(claveBase32), pasoDe(ahora) + desplazamiento);
