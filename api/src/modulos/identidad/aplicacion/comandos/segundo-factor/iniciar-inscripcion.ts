import type { Reloj } from '../../../../../compartido/aplicacion/index.js';
import { verificoHacePoco } from '../../../dominio/index.js';
import type { SesionConUsuario, UnidadDeTrabajoDeIdentidad } from '../../puertos/repositorios-de-identidad.js';
import type { HuellasDeAcceso } from '../../puertos/secretos-de-acceso.js';
import type { SecretosDeSegundoFactor } from '../../puertos/secretos-de-segundo-factor.js';
import { eventoDe } from './evento.js';
import { uriDeLaApp } from './uri-de-la-app.js';

export interface InscripcionIniciada {
  /** Clave en base32 para escribirla a mano en la app autenticadora. */
  readonly secreto: string;
  /** La misma clave como enlace otpauth://, para el QR. */
  readonly uri: string;
  readonly venceEn: Date;
}

/**
 * Empieza a configurar la app autenticadora (HU-04.04): crea un secreto, lo guarda cifrado como pendiente y lo
 * muestra una sola vez. Si ya hay una app, cambiarla exige haber verificado hace poco en esta sesión.
 */
export class IniciarInscripcion {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly secretos: SecretosDeSegundoFactor,
    private readonly huellas: HuellasDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(sesion: SesionConUsuario): Promise<InscripcionIniciada> {
    const ahora = this.reloj.ahora();
    const { usuario } = sesion;
    const secreto = this.secretos.nuevoSecreto(usuario.id);
    const venceEn = await this.uow.ejecutar(async ({ segundosFactores, registroDeSegundoFactor }) => {
      const factor = await segundosFactores.tomar(usuario.id);
      factor.iniciarInscripcion(secreto.cifrado, ahora, verificoHacePoco(sesion.sesion, ahora));
      await segundosFactores.guardar(factor);
      await registroDeSegundoFactor.anotar(eventoDe('inscripcion-iniciada', sesion, this.huellas.nuevoId(), ahora));
      return factor.foto.pendiente!.venceEn;
    });
    return { secreto: secreto.claro, uri: uriDeLaApp(secreto.claro, usuario.celular), venceEn };
  }
}
