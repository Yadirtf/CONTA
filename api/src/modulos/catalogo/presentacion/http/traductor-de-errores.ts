import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { CODIGO_SIN_PERMISO, ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Estado HTTP de las reglas del catálogo que no son de forma; las demás (datos inválidos) responden 400. */
const ESTADOS: Readonly<Record<string, HttpStatus>> = {
  [CODIGO_SIN_PERMISO]: HttpStatus.FORBIDDEN,
  'cliente.id-en-uso': HttpStatus.CONFLICT,
  'cliente.limite-diario': HttpStatus.TOO_MANY_REQUESTS,
  'producto.codigo-en-uso': HttpStatus.CONFLICT,
  'producto.limite-diario': HttpStatus.TOO_MANY_REQUESTS,
  'producto.limite-por-persona': HttpStatus.TOO_MANY_REQUESTS,
};

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: unknown): void;
}

/** Traduce los ErrorDominio del catálogo (clientes y productos) a HTTP con un código estable. Nunca repite el documento recibido. */
@Catch(ErrorDominio)
export class TraductorDeErroresDeCatalogo implements ExceptionFilter<ErrorDominio> {
  catch(error: ErrorDominio, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<RespuestaHttp>()
      .status(ESTADOS[error.codigo] ?? HttpStatus.BAD_REQUEST)
      .json({ codigo: error.codigo, mensaje: error.message });
  }
}
