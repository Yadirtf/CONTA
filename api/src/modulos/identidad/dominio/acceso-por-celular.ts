import type { Celular } from './celular.js';
import { ErrorDeAcceso } from './error-de-acceso.js';
import { POLITICA_DE_ACCESO as P } from './politica-de-acceso.js';

/** Código vigente. Solo se guarda su huella (HMAC): el código en claro nunca llega a la base. */
export interface CodigoEmitido {
  readonly huella: string;
  readonly venceEn: Date;
}

/** Estado guardado de un celular. Se reconstruye desde la base con `AccesoPorCelular.desde`. */
export interface EstadoDeAcceso {
  readonly celular: Celular;
  readonly codigo: CodigoEmitido | null;
  readonly fallos: number;
  readonly bloqueadoHasta: Date | null;
  readonly ventanaDesde: Date | null;
  readonly codigosEnVentana: number;
  readonly ultimoCodigoEn: Date | null;
}

export type ResultadoDeVerificacion = { readonly acerto: true } | { readonly acerto: false; readonly error: ErrorDeAcceso };

const despues = (fecha: Date, ms: number) => new Date(fecha.getTime() + ms);

/**
 * Agregado del acceso con código de un celular (HU-04.01). Decide si se puede pedir un código, si un intento
 * cuenta como fallo y cuándo se bloquea. No sabe de criptografía: quien lo usa le dice si el código coincide.
 * Reglas:
 * - un código vence a los 10 minutos y sirve una sola vez;
 * - 5 fallos seguidos bloquean el celular 15 minutos; pedir un código nuevo no borra los fallos;
 * - entre dos códigos hay 1 minuto y como máximo 5 por hora.
 */
export class AccesoPorCelular {
  private constructor(private estado: EstadoDeAcceso) {}

  static nuevo(celular: Celular): AccesoPorCelular {
    return new AccesoPorCelular({
      celular,
      codigo: null,
      fallos: 0,
      bloqueadoHasta: null,
      ventanaDesde: null,
      codigosEnVentana: 0,
      ultimoCodigoEn: null,
    });
  }

  static desde(estado: EstadoDeAcceso): AccesoPorCelular {
    return new AccesoPorCelular(estado);
  }

  get foto(): EstadoDeAcceso {
    return this.estado;
  }

  /** Registra un código nuevo. Lanza ErrorDeAcceso si el celular está bloqueado o pidió demasiados. */
  emitirCodigo(huella: string, ahora: Date): CodigoEmitido {
    this.exigirSinBloqueo(ahora);
    const { ultimoCodigoEn } = this.estado;
    if (ultimoCodigoEn && ahora.getTime() - ultimoCodigoEn.getTime() < P.esperaEntreCodigosMs) {
      throw new ErrorDeAcceso('acceso.espera', { reintentarDesde: despues(ultimoCodigoEn, P.esperaEntreCodigosMs) });
    }
    const ventanaVigente = this.estado.ventanaDesde && ahora.getTime() - this.estado.ventanaDesde.getTime() < P.ventanaDeCodigosMs;
    const ventanaDesde = ventanaVigente && this.estado.ventanaDesde ? this.estado.ventanaDesde : ahora;
    const codigosEnVentana = ventanaVigente ? this.estado.codigosEnVentana : 0;
    if (codigosEnVentana >= P.codigosPorHora) {
      throw new ErrorDeAcceso('acceso.limite', { reintentarDesde: despues(ventanaDesde, P.ventanaDeCodigosMs) });
    }
    const codigo = { huella, venceEn: despues(ahora, P.vigenciaDelCodigoMs) };
    this.estado = { ...this.estado, codigo, ventanaDesde, codigosEnVentana: codigosEnVentana + 1, ultimoCodigoEn: ahora };
    return codigo;
  }

  /**
   * Revisa un intento. `coincide` compara el código escrito con la huella guardada (en tiempo constante).
   * Un acierto consume el código y borra los fallos; un fallo suma uno y al quinto bloquea.
   * No lanza: devuelve el resultado, porque un fallo también se guarda.
   */
  verificar(ahora: Date, coincide: (huella: string) => boolean): ResultadoDeVerificacion {
    const bloqueo = this.bloqueoVigente(ahora);
    if (bloqueo) return { acerto: false, error: bloqueo };
    const { codigo } = this.estado;
    if (!codigo || ahora.getTime() >= codigo.venceEn.getTime()) {
      return { acerto: false, error: new ErrorDeAcceso('acceso.sin-codigo') };
    }
    if (coincide(codigo.huella)) {
      this.estado = { ...this.estado, codigo: null, fallos: 0, bloqueadoHasta: null };
      return { acerto: true };
    }
    const fallos = this.estado.fallos + 1;
    if (fallos >= P.fallosAntesDelBloqueo) {
      const bloqueadoHasta = despues(ahora, P.duracionDelBloqueoMs);
      this.estado = { ...this.estado, codigo: null, fallos: 0, bloqueadoHasta };
      return { acerto: false, error: new ErrorDeAcceso('acceso.bloqueado', { reintentarDesde: bloqueadoHasta }) };
    }
    this.estado = { ...this.estado, fallos };
    return {
      acerto: false,
      error: new ErrorDeAcceso('acceso.codigo-incorrecto', { intentosRestantes: P.fallosAntesDelBloqueo - fallos }),
    };
  }

  private exigirSinBloqueo(ahora: Date): void {
    const bloqueo = this.bloqueoVigente(ahora);
    if (bloqueo) throw bloqueo;
  }

  private bloqueoVigente(ahora: Date): ErrorDeAcceso | null {
    const { bloqueadoHasta } = this.estado;
    return bloqueadoHasta && ahora.getTime() < bloqueadoHasta.getTime()
      ? new ErrorDeAcceso('acceso.bloqueado', { reintentarDesde: bloqueadoHasta })
      : null;
  }
}
