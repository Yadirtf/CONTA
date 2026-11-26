import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

const LARGO_MAXIMO = 450;

export class NuevaEmpresa {
  @ApiProperty({ example: 'Tienda Doña Rosa S.A.S.', maxLength: LARGO_MAXIMO })
  readonly razonSocial!: string;
}

/** Lee la razón social del cuerpo. El dominio valida el resto (espacios, largo después de recortar). */
export function razonSocialDe(cuerpo: unknown): string {
  const valor = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>)['razonSocial'] : undefined;
  if (typeof valor !== 'string' || valor.length > LARGO_MAXIMO) {
    throw new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: 'Falta el campo razonSocial' });
  }
  return valor;
}
