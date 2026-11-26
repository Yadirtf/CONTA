import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { campoDeTexto } from '../cuerpos.js';

export class CodigoDelSegundoFactor {
  @ApiProperty({
    example: '482913',
    description: 'Los 6 números de la app autenticadora o, si se perdió, un código de recuperación (ABCDE-FGHJK).',
  })
  readonly codigo!: string;
}

const DE_LA_APP = /^\d{6}$/;
const DE_RECUPERACION = /^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/;

/** Código de la app o de recuperación. Uno mal formado no cuenta como intento: no pudo acertar. */
export function codigoDelSegundoFactor(cuerpo: unknown): string {
  const codigo = campoDeTexto(cuerpo, 'codigo', 20).replace(/\s/g, '');
  if (!DE_LA_APP.test(codigo) && !DE_RECUPERACION.test(codigo)) {
    throw new BadRequestException({
      codigo: 'segundo-factor.codigo-mal-escrito',
      mensaje: 'Escribe los 6 números de tu app o un código de recuperación',
    });
  }
  return codigo;
}
