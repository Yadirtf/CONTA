import { ApiProperty } from '@nestjs/swagger';
import type { EstadoSalud } from '../../dominio/estado-salud.js';

export class RespuestaSalud implements EstadoSalud {
  @ApiProperty({ enum: ['ok'] })
  readonly estado!: 'ok';

  @ApiProperty({ enum: ['conta-api'] })
  readonly servicio!: 'conta-api';

  @ApiProperty({ example: '0.1.0' })
  readonly version!: string;

  @ApiProperty({ format: 'date-time' })
  readonly hora!: string;
}
