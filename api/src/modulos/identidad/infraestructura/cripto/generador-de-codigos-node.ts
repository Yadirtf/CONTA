import { randomInt } from 'node:crypto';
import type { GeneradorDeCodigos } from '../../aplicacion/puertos/secretos-de-acceso.js';
import { POLITICA_DE_ACCESO, type Celular } from '../../dominio/index.js';

const TOPE = 10 ** POLITICA_DE_ACCESO.largoDelCodigo;

/** Código de 6 dígitos con el generador criptográfico de Node. Los celulares de prueba reciben su código fijo. */
export class GeneradorDeCodigosNode implements GeneradorDeCodigos {
  constructor(private readonly celularesDePrueba: ReadonlyMap<string, string> = new Map()) {}

  nuevo(celular: Celular): string {
    return this.celularesDePrueba.get(celular.e164) ?? String(randomInt(TOPE)).padStart(POLITICA_DE_ACCESO.largoDelCodigo, '0');
  }
}
