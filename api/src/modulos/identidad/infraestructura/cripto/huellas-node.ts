import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { HuellasDeAcceso } from '../../aplicacion/puertos/secretos-de-acceso.js';
import type { Celular } from '../../dominio/index.js';

/**
 * Huellas con node:crypto. El código: HMAC-SHA256(secreto, celular + código), así el mismo código en dos
 * celulares da huellas distintas y sin el secreto no se puede probar el millón de combinaciones.
 * El token: 32 bytes al azar (base64url) y su SHA-256, que basta porque el token ya es imposible de adivinar.
 */
export class HuellasNode implements HuellasDeAcceso {
  private readonly secreto: Buffer;

  constructor(secreto: string | null) {
    this.secreto = secreto ? Buffer.from(secreto, 'utf8') : randomBytes(32);
  }

  huellaDeCodigo(celular: Celular, codigo: string): string {
    return createHmac('sha256', this.secreto).update(`${celular.e164}:${codigo}`).digest('hex');
  }

  coincideCodigo(celular: Celular, codigo: string, huella: string): boolean {
    const esperada = Buffer.from(huella, 'hex');
    const recibida = Buffer.from(this.huellaDeCodigo(celular, codigo), 'hex');
    return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
  }

  nuevoToken(): string {
    return randomBytes(32).toString('base64url');
  }

  huellaDeToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  nuevoId(): string {
    return randomUUID();
  }
}
