import type { SecretosDeSegundoFactor } from '../../aplicacion/puertos/secretos-de-segundo-factor.js';
import { ErrorDeSegundoFactor } from '../../dominio/index.js';

/**
 * Sin SECRETO_SEGUNDO_FACTOR el segundo factor falla cerrado: nadie puede inscribirse ni verificar (503), así
 * que un contador no entra a trabajar, pero nunca se guarda un secreto con una clave inventada que se perdería.
 */
export class SecretosSinClave implements SecretosDeSegundoFactor {
  nuevoSecreto(): never {
    throw new ErrorDeSegundoFactor('segundo-factor.sin-configurar');
  }
  pasoQueCoincide(): never {
    throw new ErrorDeSegundoFactor('segundo-factor.sin-configurar');
  }
  nuevosCodigosDeRecuperacion(): never {
    throw new ErrorDeSegundoFactor('segundo-factor.sin-configurar');
  }
  recuperacionQueCoincide(): never {
    throw new ErrorDeSegundoFactor('segundo-factor.sin-configurar');
  }
}
