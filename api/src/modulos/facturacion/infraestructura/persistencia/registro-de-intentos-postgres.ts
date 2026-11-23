import { sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { IntentoDeEnvio, RegistroDeIntentos } from '../../aplicacion/puertos/registro-de-intentos.js';
import { intentosEnvioDian } from './tablas-envio-dian.js';

/** Solo inserta: conta_api no tiene UPDATE ni DELETE sobre los intentos. */
export class RegistroDeIntentosPostgres implements RegistroDeIntentos {
  constructor(
    private readonly ejecutor: Ejecutor,
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  async agregar(intento: IntentoDeEnvio): Promise<void> {
    await this.ejecutor.insert(intentosEnvioDian).values({ empresaId: sql`conta_sistema.empresa_actual()`, id: this.nuevoId(), ...intento });
  }
}
