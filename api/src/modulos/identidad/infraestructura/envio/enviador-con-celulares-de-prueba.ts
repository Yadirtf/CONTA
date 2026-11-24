import type { EnviadorDeCodigos } from '../../aplicacion/puertos/enviador-de-codigos.js';
import type { Celular } from '../../dominio/index.js';

/** A los celulares de prueba (solo en el entorno de pruebas) no se les envía nada: su código es fijo y conocido. */
export class EnviadorConCelularesDePrueba implements EnviadorDeCodigos {
  constructor(
    private readonly celularesDePrueba: ReadonlyMap<string, string>,
    private readonly real: EnviadorDeCodigos,
  ) {}

  enviar(celular: Celular, codigo: string): Promise<void> {
    return this.celularesDePrueba.has(celular.e164) ? Promise.resolve() : this.real.enviar(celular, codigo);
  }
}
