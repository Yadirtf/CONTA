import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import { crearEstadoSalud, type EstadoSalud } from '../../dominio/estado-salud.js';

export class ConsultarSalud {
  constructor(
    private readonly reloj: Reloj,
    private readonly version: string,
  ) {}

  ejecutar(): EstadoSalud {
    return crearEstadoSalud(this.version, this.reloj.ahora());
  }
}
