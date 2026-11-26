import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { CODIGO_SIN_PERMISO, ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Estado HTTP de cada regla del dominio de empresas que se puede incumplir; las demás responden 400. */
const ESTADOS: Readonly<Record<string, HttpStatus>> = {
  'empresa.limite': HttpStatus.CONFLICT,
  'empresa.no-encontrada': HttpStatus.NOT_FOUND,
  [CODIGO_SIN_PERMISO]: HttpStatus.FORBIDDEN,
  'miembro.ya-esta': HttpStatus.CONFLICT,
  'miembro.limite': HttpStatus.CONFLICT,
  'miembro.limite-diario': HttpStatus.TOO_MANY_REQUESTS,
  'miembro.ultimo-dueno': HttpStatus.CONFLICT,
  'miembro.sobre-si-mismo': HttpStatus.CONFLICT,
  'miembro.no-encontrado': HttpStatus.NOT_FOUND,
  'miembro.retirado': HttpStatus.NOT_FOUND,
  'invitacion.no-encontrada': HttpStatus.NOT_FOUND,
};

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: unknown): void;
}

/** Traduce los ErrorDominio de empresas y miembros a HTTP con un código estable. */
@Catch(ErrorDominio)
export class TraductorDeErroresDeEmpresa implements ExceptionFilter<ErrorDominio> {
  catch(error: ErrorDominio, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<RespuestaHttp>()
      .status(ESTADOS[error.codigo] ?? HttpStatus.BAD_REQUEST)
      .json({ codigo: error.codigo, mensaje: error.message });
  }
}
