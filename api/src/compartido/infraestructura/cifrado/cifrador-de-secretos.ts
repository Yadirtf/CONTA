import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const BYTES_DEL_IV = 12;

/**
 * Cifra secretos con AES-256-GCM (HU-04.04 y HU-07.04). El dato asociado ata cada secreto a su dueño (la persona del
 * segundo factor, la empresa y la clase de documento del PIN DIAN): copiado a otra fila, no se descifra. El texto
 * lleva la versión de la clave para poder rotarla después: v1.<iv>.<cifrado>.<etiqueta>, en base64url.
 */
export class CifradorDeSecretos {
  constructor(private readonly clave: Buffer) {
    if (clave.length !== 32) throw new Error('La clave de cifrado debe tener 32 bytes');
  }

  cifrar(secreto: Buffer, asociadoA: string): string {
    const iv = randomBytes(BYTES_DEL_IV);
    const cifrador = createCipheriv('aes-256-gcm', this.clave, iv).setAAD(Buffer.from(asociadoA));
    const cifrado = Buffer.concat([cifrador.update(secreto), cifrador.final()]);
    return [VERSION, iv, cifrado, cifrador.getAuthTag()].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
  }

  /** Lanza si el texto fue alterado, es de otro dueño o de otra clave. */
  descifrar(texto: string, asociadoA: string): Buffer {
    const [version, iv, cifrado, etiqueta, sobra] = texto.split('.');
    if (version !== VERSION || !iv || !cifrado || !etiqueta || sobra !== undefined) throw new Error('Secreto cifrado con formato desconocido');
    const descifrador = createDecipheriv('aes-256-gcm', this.clave, Buffer.from(iv, 'base64url'), { authTagLength: 16 })
      .setAAD(Buffer.from(asociadoA))
      .setAuthTag(Buffer.from(etiqueta, 'base64url'));
    return Buffer.concat([descifrador.update(Buffer.from(cifrado, 'base64url')), descifrador.final()]);
  }
}
