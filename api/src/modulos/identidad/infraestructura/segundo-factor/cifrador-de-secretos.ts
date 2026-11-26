import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const BYTES_DEL_IV = 12;

/**
 * Cifra el secreto TOTP con AES-256-GCM. El id de la persona va como dato asociado: un secreto copiado a la
 * fila de otra persona no se descifra. El texto lleva la versión de la clave para poder rotarla después:
 * v1.<iv>.<cifrado>.<etiqueta>, en base64url.
 */
export class CifradorDeSecretos {
  constructor(private readonly clave: Buffer) {
    if (clave.length !== 32) throw new Error('La clave de cifrado del segundo factor debe tener 32 bytes');
  }

  cifrar(secreto: Buffer, asociadoA: string): string {
    const iv = randomBytes(BYTES_DEL_IV);
    const cifrador = createCipheriv('aes-256-gcm', this.clave, iv).setAAD(Buffer.from(asociadoA));
    const cifrado = Buffer.concat([cifrador.update(secreto), cifrador.final()]);
    return [VERSION, iv, cifrado, cifrador.getAuthTag()].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
  }

  /** Lanza si el texto fue alterado, es de otra persona o de otra clave. */
  descifrar(texto: string, asociadoA: string): Buffer {
    const [version, iv, cifrado, etiqueta] = texto.split('.');
    if (version !== VERSION || !iv || !cifrado || !etiqueta) throw new Error('Secreto del segundo factor con formato desconocido');
    const descifrador = createDecipheriv('aes-256-gcm', this.clave, Buffer.from(iv, 'base64url'))
      .setAAD(Buffer.from(asociadoA))
      .setAuthTag(Buffer.from(etiqueta, 'base64url'));
    return Buffer.concat([descifrador.update(Buffer.from(cifrado, 'base64url')), descifrador.final()]);
  }
}
