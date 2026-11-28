import { createHmac, hkdfSync } from 'node:crypto';
import { CifradorDeSecretos } from '../../../../compartido/infraestructura/cifrado/cifrador-de-secretos.js';
import type { CustodiaDeSecretos } from '../../aplicacion/puertos/custodia-de-secretos.js';
import { SecretosNoDisponibles } from '../../aplicacion/configuracion/errores-de-configuracion.js';

const LARGO_MINIMO_DEL_SECRETO = 32;
export const VARIABLE_DE_LA_CLAVE = 'SECRETO_CONFIGURACION_DIAN';

/**
 * PIN y clave técnica cifrados con AES-256-GCM (HU-07.04). La clave sale con HKDF de SECRETO_CONFIGURACION_DIAN, que
 * vive solo en el entorno (Render), nunca en la base: un volcado de la base no trae los secretos en claro.
 */
export class CustodiaAesGcm implements CustodiaDeSecretos {
  private readonly cifrador: CifradorDeSecretos;
  /** Otra clave derivada del mismo secreto: la de las huellas nunca es la del cifrado. */
  private readonly claveDeHuellas: Buffer;

  constructor(secreto: string) {
    if (secreto.length < LARGO_MINIMO_DEL_SECRETO) {
      throw new Error(`${VARIABLE_DE_LA_CLAVE} debe tener al menos ${LARGO_MINIMO_DEL_SECRETO} caracteres`);
    }
    const clave = Buffer.from(hkdfSync('sha256', Buffer.from(secreto, 'utf8'), Buffer.alloc(0), 'conta/configuracion-dian/v1', 32));
    this.cifrador = new CifradorDeSecretos(clave);
    this.claveDeHuellas = Buffer.from(hkdfSync('sha256', Buffer.from(secreto, 'utf8'), Buffer.alloc(0), 'conta/configuracion-dian/huellas/v1', 32));
  }

  cifrar(secreto: string, asociadoA: string): string {
    return this.cifrador.cifrar(Buffer.from(secreto, 'utf8'), asociadoA);
  }

  descifrar(cifrado: string, asociadoA: string): string {
    return this.cifrador.descifrar(cifrado, asociadoA).toString('utf8');
  }

  huella(contenido: string, asociadoA: string): string {
    return createHmac('sha256', this.claveDeHuellas).update(asociadoA).update('\n').update(contenido).digest('base64url');
  }
}

/** Sin clave configurada: no se guarda ni se abre nada (falla cerrado, 503 en la API). */
export class CustodiaSinClave implements CustodiaDeSecretos {
  cifrar(): string {
    throw new SecretosNoDisponibles();
  }

  descifrar(): string {
    throw new SecretosNoDisponibles();
  }

  huella(): string {
    throw new SecretosNoDisponibles();
  }
}

/** La custodia según el entorno. Un secreto corto detiene el arranque: es un error de despliegue, no algo a tolerar. */
export function custodiaDelEntorno(env: Readonly<Record<string, string | undefined>> = process.env): CustodiaDeSecretos {
  const secreto = env[VARIABLE_DE_LA_CLAVE]?.trim();
  return secreto ? new CustodiaAesGcm(secreto) : new CustodiaSinClave();
}
