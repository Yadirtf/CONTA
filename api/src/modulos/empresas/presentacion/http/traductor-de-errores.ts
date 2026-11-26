import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Estado HTTP de cada regla del dominio de empresas que se puede incumplir; las demás responden 400. */
const ESTADOS: Readonly<Record<string, HttpStatus>> = {
  'empresa.limite': HttpStatus.CONFLICT,
};

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: unknown): void;
}

/** Traduce los ErrorDominio de empresas a HTTP con un código estable. */
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
