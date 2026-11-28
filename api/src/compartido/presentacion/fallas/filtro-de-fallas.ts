import { randomUUID } from 'node:crypto';
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

interface RespuestaHttp {
  status(codigo: number): RespuestaHttp;
  json(cuerpo: unknown): void;
}

/**
 * Último filtro de la API (hallazgo H1 de la prueba de ataque de HU-05.01). Las HttpException responden como
 * siempre. Cualquier otra falla responde 500 con una referencia y deja en el registro solo esa referencia, el
 * tipo de error y, si viene de PostgreSQL, su SQLSTATE y restricción: nunca el mensaje ni los parámetros de
 * la consulta, que llevan datos personales (cédulas, nombres, correos).
 */
@Catch()
export class FiltroDeFallas implements ExceptionFilter {
  private readonly registro = new Logger('Fallas');

  catch(error: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<RespuestaHttp>();
    if (error instanceof HttpException && esJsonMalFormado(error)) {
      // El analizador de JSON repite el cuerpo en su mensaje (y ahí puede ir un PIN): nunca se devuelve (hallazgo B2).
      respuesta.status(HttpStatus.BAD_REQUEST).json({ codigo: 'peticion.json-invalido', mensaje: 'El cuerpo no es un JSON válido' });
      return;
    }
    if (error instanceof HttpException) {
      const cuerpo = error.getResponse();
      respuesta.status(error.getStatus()).json(typeof cuerpo === 'string' ? { mensaje: cuerpo } : cuerpo);
      return;
    }
    const referencia = randomUUID();
    this.registro.error(`falla ${referencia}: ${descripcionSegura(error)}`);
    respuesta
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ codigo: 'servidor.falla', mensaje: 'Algo salió mal. Intenta de nuevo.', referencia });
  }
}

/** Un 400 del analizador del cuerpo: su causa es el SyntaxError de JSON.parse, o su mensaje lo cita. */
function esJsonMalFormado(error: HttpException): boolean {
  return error.getStatus() === 400 && (error.cause instanceof SyntaxError || /is not valid JSON|in JSON at position/.test(error.message));
}

/** Tipo de error y datos técnicos de PostgreSQL que no llevan datos de nadie. */
export function descripcionSegura(error: unknown): string {
  const partes = [error instanceof Error ? error.name : typeof error];
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if ('code' in e && typeof e.code === 'string') partes.push(`SQLSTATE ${e.code}`);
    if ('constraint' in e && typeof e.constraint === 'string') partes.push(`restricción ${e.constraint}`);
  }
  return partes.join(' · ');
}
