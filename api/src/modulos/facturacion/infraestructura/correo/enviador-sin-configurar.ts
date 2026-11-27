import { FallaDeCorreo } from '../../aplicacion/correo/falla-de-correo.js';
import type { EnviadorDeCorreo } from '../../aplicacion/puertos/enviador-de-correo.js';

/** Sin proveedor configurado: cada intento es una falla pasajera, así el correo sale cuando se configure. */
export class EnviadorSinConfigurar implements EnviadorDeCorreo {
  enviar(): Promise<void> {
    return Promise.reject(new FallaDeCorreo('correo.sin-configurar', false));
  }
}
