import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import {
  CODIGO_SIN_PERMISO,
  CODIGO_SIN_SEGUNDO_FACTOR,
  CODIGO_SIN_SEGUNDO_FACTOR_RECIENTE,
  ErrorDominio,
} from '../../../../../compartido/dominio/index.js';
import { SecretosNoDisponibles } from '../../../aplicacion/configuracion/errores-de-configuracion.js';

/** Estado HTTP de las reglas de la configuración que no son de forma; las demás (datos inválidos) responden 400. */
const ESTADOS: Readonly<Record<string, HttpStatus>> = {
  [CODIGO_SIN_PERMISO]: HttpStatus.FORBIDDEN,
  [CODIGO_SIN_SEGUNDO_FACTOR]: HttpStatus.FORBIDDEN,
  [CODIGO_SIN_SEGUNDO_FACTOR_RECIENTE]: HttpStatus.FORBIDDEN,
  'configuracion.nit-con-ventas': HttpStatus.CONFLICT,
  'resolucion.id-en-uso': HttpStatus.CONFLICT,
  'resolucion.repetida': HttpStatus.CONFLICT,
  'resolucion.rango-cruzado': HttpStatus.CONFLICT,
  'resolucion.demasiadas': HttpStatus.CONFLICT,
};

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: unknown): void;
}

/**
 * Traduce los errores de la configuración DIAN a HTTP con un código estable. Sin la clave de cifrado en el servidor
 * responde 503: no se guarda ningún PIN en claro. Nunca repite lo recibido.
 */
@Catch(ErrorDominio, SecretosNoDisponibles)
export class TraductorDeErroresDeConfiguracion implements ExceptionFilter<ErrorDominio | SecretosNoDisponibles> {
  catch(error: ErrorDominio | SecretosNoDisponibles, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<RespuestaHttp>();
    if (error instanceof SecretosNoDisponibles) {
      respuesta.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        codigo: 'configuracion.no-disponible',
        mensaje: 'No podemos guardar datos reservados en este momento. Escríbenos',
      });
      return;
    }
    respuesta.status(ESTADOS[error.codigo] ?? HttpStatus.BAD_REQUEST).json({ codigo: error.codigo, mensaje: error.message });
  }
}
