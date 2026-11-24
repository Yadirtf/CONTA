import { ErrorDominio } from '../../../compartido/dominio/index.js';

export type MotivoDeRechazo =
  | 'acceso.bloqueado'
  | 'acceso.espera'
  | 'acceso.limite'
  | 'acceso.sin-codigo'
  | 'acceso.codigo-incorrecto'
  | 'acceso.envio-fallido';

const MENSAJES: Record<MotivoDeRechazo, string> = {
  'acceso.bloqueado': 'Por seguridad, este celular quedó bloqueado unos minutos. Intenta más tarde.',
  'acceso.espera': 'Ya te enviamos un código. Espera un momento antes de pedir otro.',
  'acceso.limite': 'Pediste muchos códigos. Intenta más tarde.',
  'acceso.sin-codigo': 'El código venció o ya se usó. Pide uno nuevo.',
  'acceso.codigo-incorrecto': 'El código no coincide. Revísalo e intenta de nuevo.',
  'acceso.envio-fallido': 'No pudimos enviar el código. Intenta de nuevo en un minuto.',
};

/** Rechazo del acceso con la hora desde la que se puede reintentar o los intentos que quedan. */
export class ErrorDeAcceso extends ErrorDominio {
  constructor(
    override readonly codigo: MotivoDeRechazo,
    readonly detalle: { readonly reintentarDesde?: Date; readonly intentosRestantes?: number } = {},
  ) {
    super(codigo, MENSAJES[codigo]);
    this.name = 'ErrorDeAcceso';
  }
}
