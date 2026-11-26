import { ApiProperty } from '@nestjs/swagger';
import type { Empresa } from '../../dominio/empresa.js';

export class RespuestaEmpresa {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'Tienda Doña Rosa S.A.S.' })
  readonly razonSocial!: string;
}

export const respuestaDe = (empresa: Empresa): RespuestaEmpresa => ({ id: empresa.id.valor, razonSocial: empresa.razonSocial });
