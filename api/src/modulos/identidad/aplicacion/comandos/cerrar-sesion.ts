import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import type { UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';

/** Cierra la sesión del dispositivo. La fila queda revocada como registro; el token deja de servir. */
export class CerrarSesion {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(idSesion: string): Promise<void> {
    return this.uow.ejecutar(({ sesiones }) => sesiones.revocar(idSesion, this.reloj.ahora()));
  }
}
