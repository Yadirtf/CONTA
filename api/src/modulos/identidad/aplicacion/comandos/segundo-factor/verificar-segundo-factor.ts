import type { Reloj } from '../../../../../compartido/aplicacion/index.js';
import type { ViaDeVerificacion } from '../../../dominio/index.js';
import type { SesionConUsuario, UnidadDeTrabajoDeIdentidad } from '../../puertos/repositorios-de-identidad.js';
import type { HuellasDeAcceso } from '../../puertos/secretos-de-acceso.js';
import type { SecretosDeSegundoFactor } from '../../puertos/secretos-de-segundo-factor.js';
import { eventoDe, tipoDelFallo } from './evento.js';
import { verificadaHasta } from './verificada-hasta.js';

export interface SegundoFactorVerificado {
  readonly via: ViaDeVerificacion;
  readonly verificadaHasta: Date;
  /** Códigos de recuperación que quedan: con pocos, la app sugiere cambiar de app y recibir nuevos. */
  readonly codigosDeRecuperacionRestantes: number;
}

/**
 * Pasa el segundo factor en esta sesión (HU-04.04) con un código de la app o uno de recuperación. La sesión
 * queda verificada una jornada. Un fallo se guarda antes de responder y el rechazo se lanza después.
 */
export class VerificarSegundoFactor {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly secretos: SecretosDeSegundoFactor,
    private readonly huellas: HuellasDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(sesion: SesionConUsuario, codigo: string): Promise<SegundoFactorVerificado> {
    const ahora = this.reloj.ahora();
    const { usuario } = sesion;
    const resultado = await this.uow.ejecutar(async ({ segundosFactores, sesiones, registroDeSegundoFactor }) => {
      const factor = await segundosFactores.tomar(usuario.id);
      const verificacion = factor.verificar(
        ahora,
        (cifrado) => this.secretos.pasoQueCoincide(usuario.id, cifrado, codigo, ahora),
        (huellas) => this.secretos.recuperacionQueCoincide(codigo, huellas),
      );
      await segundosFactores.guardar(factor);
      const tipo = !verificacion.acerto
        ? tipoDelFallo(verificacion.error.codigo)
        : verificacion.via === 'app'
          ? 'verificado'
          : 'verificado-con-recuperacion';
      await registroDeSegundoFactor.anotar(eventoDe(tipo, sesion, this.huellas.nuevoId(), ahora));
      if (verificacion.acerto) await sesiones.marcarVerificada(sesion.sesion.id, ahora);
      return { verificacion, restantes: factor.foto.huellasDeRecuperacion.length };
    });
    const { verificacion, restantes } = resultado;
    if (!verificacion.acerto) throw verificacion.error;
    return { via: verificacion.via, verificadaHasta: verificadaHasta(sesion, ahora), codigosDeRecuperacionRestantes: restantes };
  }
}
