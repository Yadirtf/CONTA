import { ErrorDominio } from '../../../../compartido/dominio/index.js';

export type MotivoDeSegundoFactor =
  | 'segundo-factor.bloqueado'
  | 'segundo-factor.codigo-incorrecto'
  | 'segundo-factor.sin-inscribir'
  | 'segundo-factor.ya-inscrito'
  | 'segundo-factor.sin-inscripcion-pendiente'
  | 'segundo-factor.sin-configurar';

const MENSAJES: Record<MotivoDeSegundoFactor, string> = {
  'segundo-factor.bloqueado': 'Por seguridad, la verificación quedó bloqueada unos minutos. Intenta más tarde.',
  'segundo-factor.codigo-incorrecto': 'El código no coincide. Revisa la hora del teléfono y el código de tu app.',
  'segundo-factor.sin-inscribir': 'Primero configura tu app de verificación.',
  'segundo-factor.ya-inscrito': 'Ya tienes una app de verificación. Confirma tu código antes de cambiarla.',
  'segundo-factor.sin-inscripcion-pendiente': 'La configuración venció. Empieza de nuevo.',
  'segundo-factor.sin-configurar': 'La verificación en dos pasos no está disponible en este momento.',
};

/** Rechazo del segundo factor, con la hora desde la que se puede reintentar o los intentos que quedan. */
export class ErrorDeSegundoFactor extends ErrorDominio {
  constructor(
    override readonly codigo: MotivoDeSegundoFactor,
    readonly detalle: { readonly reintentarDesde?: Date; readonly intentosRestantes?: number } = {},
  ) {
    super(codigo, MENSAJES[codigo]);
    this.name = 'ErrorDeSegundoFactor';
  }
}
