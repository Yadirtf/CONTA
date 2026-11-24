import type { Reloj } from '../../../../compartido/aplicacion/index.js';
import type { SesionVigente, UnidadDeTrabajoDeIdentidad } from '../puertos/repositorios-de-identidad.js';
import type { HuellasDeAcceso } from '../puertos/secretos-de-acceso.js';

/** Largo del token que emite HuellasDeAcceso.nuevoToken (32 bytes en base64url). Otro largo ni se busca. */
const LARGO_DEL_TOKEN = 43;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Dice de quién es un token de sesión, o null si no existe, venció o fue revocado. */
export class SesionDelToken {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly huellas: HuellasDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(token: string): Promise<SesionVigente | null> {
    if (token.length !== LARGO_DEL_TOKEN || !BASE64URL.test(token)) return null;
    const huella = this.huellas.huellaDeToken(token);
    return this.uow.ejecutar(({ sesiones }) => sesiones.buscarVigente(huella, this.reloj.ahora()));
  }
}
