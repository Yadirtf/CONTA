import type { Reloj } from '../../../../../compartido/aplicacion/index.js';
import type { SesionConUsuario, UnidadDeTrabajoDeIdentidad } from '../../puertos/repositorios-de-identidad.js';
import type { HuellasDeAcceso } from '../../puertos/secretos-de-acceso.js';
import type { SecretosDeSegundoFactor } from '../../puertos/secretos-de-segundo-factor.js';
import { eventoDe, tipoDelFallo } from './evento.js';
import { verificadaHasta } from './verificada-hasta.js';

export interface InscripcionConfirmada {
  /** Se muestran una sola vez: cada uno sirve para entrar si se pierde la app. */
  readonly codigosDeRecuperacion: readonly string[];
  readonly verificadaHasta: Date;
}

/**
 * Confirma la app autenticadora con su primer código (HU-04.04). Al acertar, la sesión queda verificada y se
 * entregan códigos de recuperación nuevos. Si reemplazó otra app, se cierran las demás sesiones de la persona.
 * Un fallo se guarda antes de responder: la transacción termina bien y el rechazo se lanza después.
 */
export class ConfirmarInscripcion {
  constructor(
    private readonly uow: UnidadDeTrabajoDeIdentidad,
    private readonly secretos: SecretosDeSegundoFactor,
    private readonly huellas: HuellasDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(sesion: SesionConUsuario, codigo: string): Promise<InscripcionConfirmada> {
    const ahora = this.reloj.ahora();
    const { usuario } = sesion;
    const recuperacion = this.secretos.nuevosCodigosDeRecuperacion();
    const resultado = await this.uow.ejecutar(async ({ segundosFactores, sesiones, registroDeSegundoFactor }) => {
      const factor = await segundosFactores.tomar(usuario.id);
      const confirmacion = factor.confirmarInscripcion(
        ahora,
        (cifrado) => this.secretos.pasoQueCoincide(usuario.id, cifrado, codigo, ahora),
        recuperacion.huellas,
      );
      await segundosFactores.guardar(factor);
      const tipo = confirmacion.acerto ? (confirmacion.reemplazo ? 'reemplazado' : 'inscrito') : tipoDelFallo(confirmacion.error.codigo);
      await registroDeSegundoFactor.anotar(eventoDe(tipo, sesion, this.huellas.nuevoId(), ahora));
      if (!confirmacion.acerto) return confirmacion;

      await sesiones.marcarVerificada(sesion.sesion.id, ahora);
      if (confirmacion.reemplazo) await sesiones.revocarLasDemas(usuario.id, sesion.sesion.id, ahora);
      return confirmacion;
    });
    if (!resultado.acerto) throw resultado.error;
    return { codigosDeRecuperacion: recuperacion.claros, verificadaHasta: verificadaHasta(sesion, ahora) };
  }
}
