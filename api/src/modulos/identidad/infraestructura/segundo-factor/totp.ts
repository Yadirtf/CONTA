import { createHmac, timingSafeEqual } from 'node:crypto';

// TOTP de RFC 6238 con los parámetros que todas las apps autenticadoras entienden: HMAC-SHA1, 6 dígitos y
// pasos de 30 segundos. Se acepta un paso de margen a cada lado por la hora desajustada del teléfono.
const SEGUNDOS_POR_PASO = 30;
const DIGITOS = 6;
const MARGEN_DE_PASOS = 1;
const CODIGO = /^\d{6}$/;

export const pasoDe = (fecha: Date): number => Math.floor(fecha.getTime() / 1000 / SEGUNDOS_POR_PASO);

/** Código HOTP (RFC 4226) del secreto en ese paso. */
export function codigoDelPaso(secreto: Buffer, paso: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const hmac = createHmac('sha1', secreto).update(contador).digest();
  const desplazamiento = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const numero = hmac.readUInt32BE(desplazamiento) & 0x7fffffff;
  return String(numero % 10 ** DIGITOS).padStart(DIGITOS, '0');
}

/** Paso con el que coincide el código escrito, revisando todos los del margen en tiempo constante, o null. */
export function pasoQueCoincide(secreto: Buffer, codigo: string, ahora: Date): number | null {
  if (!CODIGO.test(codigo)) return null;
  const escrito = Buffer.from(codigo);
  const actual = pasoDe(ahora);
  let encontrado: number | null = null;
  for (let paso = actual - MARGEN_DE_PASOS; paso <= actual + MARGEN_DE_PASOS; paso++) {
    if (timingSafeEqual(Buffer.from(codigoDelPaso(secreto, paso)), escrito) && encontrado === null) encontrado = paso;
  }
  return encontrado;
}
