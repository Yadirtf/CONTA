import { hkdfSync, randomBytes } from 'node:crypto';
import type {
  CodigosDeRecuperacion,
  SecretoNuevo,
  SecretosDeSegundoFactor,
} from '../../aplicacion/puertos/secretos-de-segundo-factor.js';
import { type IdUsuario, POLITICA_DE_SEGUNDO_FACTOR } from '../../dominio/index.js';
import { aBase32 } from './base32.js';
import { CifradorDeSecretos } from './cifrador-de-secretos.js';
import { CodigosDeRecuperacionNode } from './codigos-de-recuperacion.js';
import { pasoQueCoincide } from './totp.js';

/** 20 bytes: el largo que recomienda RFC 4226 para HMAC-SHA1. */
const BYTES_DEL_SECRETO = 20;

/** Clave propia para cada uso, derivada con HKDF de SECRETO_SEGUNDO_FACTOR. */
const claveDe = (secreto: string, uso: string): Buffer =>
  Buffer.from(hkdfSync('sha256', Buffer.from(secreto, 'utf8'), Buffer.alloc(0), `conta/segundo-factor/${uso}`, 32));

/** Secretos del segundo factor con node:crypto (ADR-0013). Une el cifrado, el TOTP y los códigos de recuperación. */
export class SecretosDeSegundoFactorNode implements SecretosDeSegundoFactor {
  private readonly cifrador: CifradorDeSecretos;
  private readonly recuperacion: CodigosDeRecuperacionNode;

  constructor(secreto: string) {
    this.cifrador = new CifradorDeSecretos(claveDe(secreto, 'cifrado-totp/v1'));
    this.recuperacion = new CodigosDeRecuperacionNode(claveDe(secreto, 'recuperacion/v1'));
  }

  nuevoSecreto(usuarioId: IdUsuario): SecretoNuevo {
    const bytes = randomBytes(BYTES_DEL_SECRETO);
    return { claro: aBase32(bytes), cifrado: this.cifrador.cifrar(bytes, usuarioId.valor) };
  }

  pasoQueCoincide(usuarioId: IdUsuario, secretoCifrado: string, codigo: string, ahora: Date): number | null {
    return pasoQueCoincide(this.cifrador.descifrar(secretoCifrado, usuarioId.valor), codigo, ahora);
  }

  nuevosCodigosDeRecuperacion(): CodigosDeRecuperacion {
    return this.recuperacion.nuevos(POLITICA_DE_SEGUNDO_FACTOR.codigosDeRecuperacion);
  }

  recuperacionQueCoincide(codigo: string, huellas: readonly string[]): number | null {
    return this.recuperacion.posicionDe(codigo, huellas);
  }
}
