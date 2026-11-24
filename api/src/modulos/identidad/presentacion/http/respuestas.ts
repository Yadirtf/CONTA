import { ApiProperty } from '@nestjs/swagger';

export class CodigoEnviado {
  @ApiProperty({ format: 'date-time', description: 'El código vence a los 10 minutos.' })
  readonly venceEn!: string;

  @ApiProperty({ format: 'date-time', description: 'Desde cuándo se puede pedir otro código.' })
  readonly otroCodigoDesde!: string;
}

export class UsuarioAutenticado {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: '+573001234567' })
  readonly celular!: string;
}

export class SesionAbierta {
  @ApiProperty({ description: 'Va en Authorization: Bearer <token>. Guárdalo en el almacén seguro del dispositivo.' })
  readonly token!: string;

  @ApiProperty({ format: 'date-time' })
  readonly venceEn!: string;

  @ApiProperty({ type: UsuarioAutenticado })
  readonly usuario!: UsuarioAutenticado;

  @ApiProperty({ description: 'true si este acceso registró a la persona.' })
  readonly nuevo!: boolean;
}

export class RechazoDeAcceso {
  @ApiProperty({ example: 'acceso.codigo-incorrecto' })
  readonly codigo!: string;

  @ApiProperty({ example: 'El código no coincide. Revísalo e intenta de nuevo.' })
  readonly mensaje!: string;

  @ApiProperty({ required: false, format: 'date-time' })
  readonly reintentarDesde?: string;

  @ApiProperty({ required: false, example: 3 })
  readonly intentosRestantes?: number;
}
