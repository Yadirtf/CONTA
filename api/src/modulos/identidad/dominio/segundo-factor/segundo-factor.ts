import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import { ErrorDeSegundoFactor } from './error-de-segundo-factor.js';
import { POLITICA_DE_SEGUNDO_FACTOR as P } from './politica-de-segundo-factor.js';

/** App autenticadora mostrada a la persona y aún sin confirmar con un primer código. */
export interface InscripcionPendiente {
  readonly secretoCifrado: string;
  readonly venceEn: Date;
}

/** Estado guardado del segundo factor de una persona. Se reconstruye desde la base con `SegundoFactor.desde`. */
export interface EstadoDeSegundoFactor {
  readonly usuarioId: IdUsuario;
  /** Secreto TOTP confirmado, cifrado: el dominio nunca lo ve en claro. */
  readonly secretoCifrado: string | null;
  readonly confirmadoEn: Date | null;
  readonly pendiente: InscripcionPendiente | null;
  /** Último paso de 30 s aceptado: un código ya usado no vuelve a servir. */
  readonly ultimoPaso: number | null;
  readonly fallos: number;
  readonly bloqueadoHasta: Date | null;
  /** Huellas de los códigos de recuperación que aún no se usan. */
  readonly huellasDeRecuperacion: readonly string[];
}

/** Paso de tiempo con el que coincide el código escrito para ese secreto, o null. Lo calcula la infraestructura. */
export type PasoQueCoincide = (secretoCifrado: string) => number | null;
/** Posición del código de recuperación escrito entre esas huellas, o null. */
export type RecuperacionQueCoincide = (huellas: readonly string[]) => number | null;

export type ViaDeVerificacion = 'app' | 'recuperacion';

export type ResultadoDeSegundoFactor<T> =
  | ({ readonly acerto: true } & T)
  | { readonly acerto: false; readonly error: ErrorDeSegundoFactor };

const despues = (fecha: Date, ms: number) => new Date(fecha.getTime() + ms);

/**
 * Agregado del segundo factor de una persona (HU-04.04, ADR-0013): una app autenticadora (TOTP) y sus códigos
 * de recuperación. No sabe de criptografía: quien lo usa le dice con qué paso coincide un código.
 * Reglas:
 * - inscribir es mostrar un secreto y confirmarlo con un primer código antes de 15 minutos;
 * - cambiar de app exige haber verificado hace poco: el WhatsApp solo nunca basta;
 * - un código de la app sirve una vez (anti-repetición por paso de tiempo); uno de recuperación, también;
 * - 5 fallos seguidos bloquean 15 minutos, cuenten de la inscripción o de la verificación.
 */
export class SegundoFactor {
  private constructor(private estado: EstadoDeSegundoFactor) {}

  static nuevo(usuarioId: IdUsuario): SegundoFactor {
    return new SegundoFactor({
      usuarioId,
      secretoCifrado: null,
      confirmadoEn: null,
      pendiente: null,
      ultimoPaso: null,
      fallos: 0,
      bloqueadoHasta: null,
      huellasDeRecuperacion: [],
    });
  }

  static desde(estado: EstadoDeSegundoFactor): SegundoFactor {
    return new SegundoFactor(estado);
  }

  get foto(): EstadoDeSegundoFactor {
    return this.estado;
  }

  get inscrito(): boolean {
    return this.estado.secretoCifrado !== null;
  }

  /**
   * Guarda el secreto nuevo como pendiente. Si ya hay una app, reemplazarla exige que la sesión haya verificado
   * hace poco: así quien solo tiene el WhatsApp de la víctima no puede poner su propia app.
   */
  iniciarInscripcion(secretoCifrado: string, ahora: Date, verificoHacePoco: boolean): void {
    this.exigirSinBloqueo(ahora);
    if (this.inscrito && !verificoHacePoco) throw new ErrorDeSegundoFactor('segundo-factor.ya-inscrito');
    this.estado = { ...this.estado, pendiente: { secretoCifrado, venceEn: despues(ahora, P.vigenciaDeLaInscripcionMs) } };
  }

  /**
   * Confirma la inscripción con un primer código de la app nueva. Al acertar, esa app queda como la única,
   * los códigos de recuperación anteriores dejan de servir y quedan los nuevos. No lanza: un fallo se guarda.
   */
  confirmarInscripcion(
    ahora: Date,
    coincide: PasoQueCoincide,
    huellasNuevas: readonly string[],
  ): ResultadoDeSegundoFactor<{ readonly reemplazo: boolean }> {
    const bloqueo = this.bloqueoVigente(ahora);
    if (bloqueo) return { acerto: false, error: bloqueo };
    const { pendiente } = this.estado;
    if (!pendiente || ahora.getTime() >= pendiente.venceEn.getTime()) {
      return { acerto: false, error: new ErrorDeSegundoFactor('segundo-factor.sin-inscripcion-pendiente') };
    }
    const paso = coincide(pendiente.secretoCifrado);
    if (paso === null) return this.fallar(ahora);
    const reemplazo = this.inscrito;
    this.estado = {
      ...this.estado,
      secretoCifrado: pendiente.secretoCifrado,
      confirmadoEn: ahora,
      pendiente: null,
      ultimoPaso: paso,
      fallos: 0,
      bloqueadoHasta: null,
      huellasDeRecuperacion: [...huellasNuevas],
    };
    return { acerto: true, reemplazo };
  }

  /**
   * Revisa un código de la app o, si no coincide, uno de recuperación (que se gasta). Un código de la app ya
   * aceptado no vuelve a servir. No lanza: un fallo también se guarda.
   */
  verificar(
    ahora: Date,
    coincidePaso: PasoQueCoincide,
    coincideRecuperacion: RecuperacionQueCoincide,
  ): ResultadoDeSegundoFactor<{ readonly via: ViaDeVerificacion }> {
    const bloqueo = this.bloqueoVigente(ahora);
    if (bloqueo) return { acerto: false, error: bloqueo };
    const { secretoCifrado, ultimoPaso, huellasDeRecuperacion } = this.estado;
    if (!secretoCifrado) return { acerto: false, error: new ErrorDeSegundoFactor('segundo-factor.sin-inscribir') };

    const paso = coincidePaso(secretoCifrado);
    if (paso !== null && (ultimoPaso === null || paso > ultimoPaso)) {
      this.estado = { ...this.estado, ultimoPaso: paso, fallos: 0, bloqueadoHasta: null };
      return { acerto: true, via: 'app' };
    }
    const posicion = paso === null ? coincideRecuperacion(huellasDeRecuperacion) : null;
    if (posicion !== null) {
      const restantes = huellasDeRecuperacion.filter((_, i) => i !== posicion);
      this.estado = { ...this.estado, huellasDeRecuperacion: restantes, fallos: 0, bloqueadoHasta: null };
      return { acerto: true, via: 'recuperacion' };
    }
    return this.fallar(ahora);
  }

  private fallar(ahora: Date): { readonly acerto: false; readonly error: ErrorDeSegundoFactor } {
    const fallos = this.estado.fallos + 1;
    if (fallos >= P.fallosAntesDelBloqueo) {
      const bloqueadoHasta = despues(ahora, P.duracionDelBloqueoMs);
      this.estado = { ...this.estado, fallos: 0, bloqueadoHasta };
      return { acerto: false, error: new ErrorDeSegundoFactor('segundo-factor.bloqueado', { reintentarDesde: bloqueadoHasta }) };
    }
    this.estado = { ...this.estado, fallos };
    return {
      acerto: false,
      error: new ErrorDeSegundoFactor('segundo-factor.codigo-incorrecto', { intentosRestantes: P.fallosAntesDelBloqueo - fallos }),
    };
  }

  private exigirSinBloqueo(ahora: Date): void {
    const bloqueo = this.bloqueoVigente(ahora);
    if (bloqueo) throw bloqueo;
  }

  private bloqueoVigente(ahora: Date): ErrorDeSegundoFactor | null {
    const { bloqueadoHasta } = this.estado;
    return bloqueadoHasta && ahora.getTime() < bloqueadoHasta.getTime()
      ? new ErrorDeSegundoFactor('segundo-factor.bloqueado', { reintentarDesde: bloqueadoHasta })
      : null;
  }
}
