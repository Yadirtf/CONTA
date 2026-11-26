import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { EventoDeSegundoFactor, RegistroDeSegundoFactor } from '../../aplicacion/puertos/registro-de-segundo-factor.js';
import { eventosDeSegundoFactor } from './tablas-identidad.js';

/** Anota cada paso del segundo factor en una tabla de solo inserción (conta_api no puede cambiarla ni borrarla). */
export class RegistroDeSegundoFactorPostgres implements RegistroDeSegundoFactor {
  constructor(private readonly ejecutor: Ejecutor) {}

  async anotar(evento: EventoDeSegundoFactor): Promise<void> {
    await this.ejecutor.insert(eventosDeSegundoFactor).values({
      id: evento.id,
      usuarioId: evento.usuarioId.valor,
      sesionId: evento.sesionId,
      tipo: evento.tipo,
      ocurridoEn: evento.ocurridoEn,
    });
  }
}
