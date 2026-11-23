// Certificado de firma digital del facturador (archivo .p12 / PKCS#12 y su contraseña), tal como lo
// entrega la custodia (HU-07.02). Es material secreto: los campos son privados (#), y JSON, util.inspect
// y String() muestran solo «[CertificadoDeFirma]», así que un log o un error que lo incluya por accidente
// no lo filtra. Solo el firmador lo abre, con usar(), y quien lo creó lo borra con descartar().

const OCULTO = '[CertificadoDeFirma]';
/** Mayor que cualquier .p12 real (unos pocos KB); limita el trabajo de leer un archivo hostil. */
export const TAMANO_MAXIMO_DEL_P12 = 64 * 1024;

export class CertificadoDeFirma {
  readonly #p12: Uint8Array;
  #contrasena: string;
  #descartado = false;

  private constructor(p12: Uint8Array, contrasena: string) {
    this.#p12 = p12;
    this.#contrasena = contrasena;
  }

  /** Copia los bytes: borrar la copia con descartar() no toca el arreglo del llamador. */
  static de(p12: Uint8Array, contrasena: string): CertificadoDeFirma {
    if (p12.length === 0 || p12.length > TAMANO_MAXIMO_DEL_P12) {
      throw new RangeError('El certificado de firma está vacío o es demasiado grande');
    }
    return new CertificadoDeFirma(Uint8Array.from(p12), contrasena);
  }

  /** Entrega los bytes y la contraseña solo mientras dura la función. */
  usar<T>(uso: (p12: Uint8Array, contrasena: string) => T): T {
    if (this.#descartado) throw new Error('El certificado de firma ya fue descartado');
    return uso(this.#p12, this.#contrasena);
  }

  /** Sobrescribe los bytes con ceros y suelta la contraseña. */
  descartar(): void {
    this.#p12.fill(0);
    this.#contrasena = '';
    this.#descartado = true;
  }

  toJSON(): string {
    return OCULTO;
  }

  toString(): string {
    return OCULTO;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return OCULTO;
  }
}
