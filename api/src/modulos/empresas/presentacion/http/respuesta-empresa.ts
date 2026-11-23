import { ApiProperty } from '@nestjs/swagger';

export class RespuestaEmpresa {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'Tienda Doña Rosa S.A.S.' })
  readonly razonSocial!: string;
}
