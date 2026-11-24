import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import { ErrorDeAcceso, type MotivoDeRechazo } from '../../dominio/index.js';

const ESTADOS: Record<MotivoDeRechazo, HttpStatus> = {
  'acceso.bloqueado': HttpStatus.TOO_MANY_REQUESTS,
  'acceso.espera': HttpStatus.TOO_MANY_REQUESTS,
  'acceso.limite': HttpStatus.TOO_MANY_REQUESTS,
  'acceso.sin-codigo': HttpStatus.UNAUTHORIZED,
  'acceso.codigo-incorrecto': HttpStatus.UNAUTHORIZED,
  'acceso.envio-fallido': HttpStatus.SERVICE_UNAVAILABLE,
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
    if (!(error instanceof ErrorDeAcceso)) {
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
