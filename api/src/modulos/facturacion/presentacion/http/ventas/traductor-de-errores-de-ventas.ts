import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { CODIGO_SIN_PERMISO, ErrorDominio } from '../../../../../compartido/dominio/index.js';

/** Estado HTTP de las reglas de la venta que no son de forma; las demás (datos inválidos) responden 400. */
const ESTADOS: Readonly<Record<string, HttpStatus>> = {
  [CODIGO_SIN_PERMISO]: HttpStatus.FORBIDDEN,
  'venta.no-encontrada': HttpStatus.NOT_FOUND,
  'venta.id-en-uso': HttpStatus.CONFLICT,
  'venta.producto-no-encontrado': HttpStatus.UNPROCESSABLE_ENTITY,
  'venta.comprador-no-encontrado': HttpStatus.UNPROCESSABLE_ENTITY,
  'facturacion.no-habilitada': HttpStatus.CONFLICT,
  'facturacion.sin-numeracion': HttpStatus.CONFLICT,
  'facturacion.numeracion-en-conflicto': HttpStatus.CONFLICT,
  'venta.limite-diario': HttpStatus.TOO_MANY_REQUESTS,
  'venta.limite-por-persona': HttpStatus.TOO_MANY_REQUESTS,
};

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: unknown): void;
}

/**
 * Traduce los ErrorDominio de las ventas a HTTP con un código estable. Un error de una regla de la factura
 * (factura.*) con datos ya guardados no llega aquí: la emisión corre aparte y no cambia la respuesta.
 */
@Catch(ErrorDominio)
export class TraductorDeErroresDeVentas implements ExceptionFilter<ErrorDominio> {
  catch(error: ErrorDominio, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<RespuestaHttp>()
      .status(ESTADOS[error.codigo] ?? HttpStatus.BAD_REQUEST)
      .json({ codigo: error.codigo, mensaje: error.message });
  }
}
