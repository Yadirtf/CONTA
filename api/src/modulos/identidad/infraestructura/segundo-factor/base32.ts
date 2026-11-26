// Base32 de RFC 4648, sin relleno: el formato en que las apps autenticadoras reciben la clave.
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function aBase32(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let texto = '';
  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      texto += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) texto += ALFABETO[(valor << (5 - bits)) & 31];
  return texto;
}
