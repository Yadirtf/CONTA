import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import { ErrorDeAcceso, ErrorDeSegundoFactor, type MotivoDeRechazo, type MotivoDeSegundoFactor } from '../../dominio/index.js';

const ESTADOS: Record<MotivoDeRechazo | MotivoDeSegundoFactor, HttpStatus> = {
  'acceso.bloqueado': HttpStatus.TOO_MANY_REQUESTS,
  'acceso.espera': HttpStatus.TOO_MANY_REQUESTS,
  'acceso.limite': HttpStatus.TOO_MANY_REQUESTS,
  'acceso.sin-codigo': HttpStatus.UNAUTHORIZED,
  'acceso.codigo-incorrecto': HttpStatus.UNAUTHORIZED,
  'acceso.envio-fallido': HttpStatus.SERVICE_UNAVAILABLE,
  // Segundo factor (HU-04.04): la sesión es válida, así que un código mal puesto no es un 401.
  'segundo-factor.bloqueado': HttpStatus.TOO_MANY_REQUESTS,
  'segundo-factor.codigo-incorrecto': HttpStatus.UNPROCESSABLE_ENTITY,
  'segundo-factor.sin-inscribir': HttpStatus.CONFLICT,
  'segundo-factor.ya-inscrito': HttpStatus.CONFLICT,
  'segundo-factor.sin-inscripcion-pendiente': HttpStatus.CONFLICT,
  'segundo-factor.sin-configurar': HttpStatus.SERVICE_UNAVAILABLE,
};

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  setHeader(nombre: string, valor: string): void;
  json(cuerpo: unknown): void;
}

/** Traduce los rechazos del dominio a HTTP con un código estable y, si aplica, Retry-After. */
@Catch(ErrorDominio)
export class TraductorDeRechazos implements ExceptionFilter<ErrorDominio> {
  catch(error: ErrorDominio, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<RespuestaHttp>();
    if (!(error instanceof ErrorDeAcceso || error instanceof ErrorDeSegundoFactor)) {
      respuesta.status(HttpStatus.BAD_REQUEST).json({ codigo: error.codigo, mensaje: error.message });
      return;
    }
    const { reintentarDesde, intentosRestantes } = error.detalle;
    if (reintentarDesde) {
      respuesta.setHeader('Retry-After', String(Math.max(1, Math.ceil((reintentarDesde.getTime() - Date.now()) / 1000))));
    }
    respuesta.status(ESTADOS[error.codigo]).json({
      codigo: error.codigo,
      mensaje: error.message,
      ...(reintentarDesde && { reintentarDesde: reintentarDesde.toISOString() }),
      ...(intentosRestantes !== undefined && { intentosRestantes }),
    });
  }
}
