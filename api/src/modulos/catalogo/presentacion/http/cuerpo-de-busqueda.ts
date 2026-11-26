import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

const LARGO_MAXIMO = 40;

/**
 * La búsqueda va en el cuerpo de un POST y no en la URL: así el documento de una persona no queda en los
 * registros de acceso de Render y Cloudflare ni en el historial del navegador (Ley 1581).
 */
export class Busqueda {
  @ApiProperty({ example: '900373', description: 'El comienzo del documento: 3 letras o números como mínimo.' })
  readonly documento!: string;
}

export function documentoDe(cuerpo: unknown): string {
  const documento = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>)['documento'] : undefined;
  if (typeof documento !== 'string' || documento.length > LARGO_MAXIMO) {
    throw new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: 'Revisa el campo documento' });
  }
  return documento;
}
