import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { CodigosDeRecuperacion } from '../../aplicacion/puertos/secretos-de-segundo-factor.js';

// Sin letras ni números que se confunden al copiarlos a mano (I, L, O, 0, 1).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO = 10;

/**
 * Códigos de recuperación: 10 caracteres al azar (unos 49 bits), mostrados como ABCDE-FGHIJ. Se guarda su HMAC
 * con una clave del entorno, así que un respaldo de la base no permite probarlos sin conexión.
 */
export class CodigosDeRecuperacionNode {
  constructor(private readonly clave: Buffer) {}

  nuevos(cantidad: number): CodigosDeRecuperacion {
    const claros = Array.from({ length: cantidad }, () => {
      const texto = Array.from({ length: LARGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
      return `${texto.slice(0, 5)}-${texto.slice(5)}`;
    });
    return { claros, huellas: claros.map((c) => this.huella(normalizar(c))) };
  }

  /** Posición del código escrito entre las huellas. Revisa todas, en tiempo constante, para no filtrar cuál. */
  posicionDe(codigo: string, huellas: readonly string[]): number | null {
    const limpio = normalizar(codigo);
    if (limpio.length !== LARGO) return null;
    const escrita = Buffer.from(this.huella(limpio), 'hex');
    let posicion: number | null = null;
    huellas.forEach((huella, i) => {
      const guardada = Buffer.from(huella, 'hex');
      if (guardada.length === escrita.length && timingSafeEqual(guardada, escrita) && posicion === null) posicion = i;
    });
    return posicion;
  }

  private huella(codigoLimpio: string): string {
    return createHmac('sha256', this.clave).update(codigoLimpio).digest('hex');
  }
}

const normalizar = (codigo: string): string => codigo.toUpperCase().replace(/[\s-]/g, '');
