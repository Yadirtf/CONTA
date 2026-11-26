import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { CelularesDePersonas, RegistrarPersona } from '../../../identidad/index.js';
import type { DirectorioDePersonas } from '../../aplicacion/puertos/directorio-de-personas.js';

/** Directorio de personas sobre la API pública del módulo de identidad (HU-04.03). */
export class DirectorioConIdentidad implements DirectorioDePersonas {
  constructor(
    private readonly registrarPersona: RegistrarPersona,
    private readonly celularesDePersonas: CelularesDePersonas,
  ) {}

  registrar(celular: string): Promise<IdUsuario> {
    return this.registrarPersona.ejecutar(celular);
  }

  celularesDe(ids: readonly IdUsuario[]): Promise<ReadonlyMap<string, string>> {
    return this.celularesDePersonas.ejecutar(ids);
  }
}
