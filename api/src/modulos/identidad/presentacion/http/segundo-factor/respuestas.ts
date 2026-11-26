import { ApiProperty } from '@nestjs/swagger';

export class EstadoDelSegundoFactor {
  @ApiProperty({ description: 'true si la persona ya configuró su app autenticadora.' })
  readonly inscrito!: boolean;

  @ApiProperty({ format: 'date-time', nullable: true, type: String, description: 'Hasta cuándo vale la verificación de esta sesión.' })
  readonly verificadaHasta!: string | null;

  @ApiProperty({ example: 10 })
  readonly codigosDeRecuperacionRestantes!: number;
}

export class InscripcionIniciada {
  @ApiProperty({ example: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', description: 'Clave en base32. Se muestra una sola vez.' })
  readonly secreto!: string;

  @ApiProperty({ example: 'otpauth://totp/CONTA:...', description: 'La misma clave como enlace, para el QR.' })
  readonly uri!: string;

  @ApiProperty({ format: 'date-time', description: 'Hasta cuándo se puede confirmar con el primer código.' })
  readonly venceEn!: string;
}

export class InscripcionConfirmada {
  @ApiProperty({ type: [String], description: 'Se muestran una sola vez. Cada uno sirve para entrar si se pierde la app.' })
  readonly codigosDeRecuperacion!: string[];

  @ApiProperty({ format: 'date-time' })
  readonly verificadaHasta!: string;
}

export class SegundoFactorVerificado {
  @ApiProperty({ enum: ['app', 'recuperacion'] })
  readonly via!: 'app' | 'recuperacion';

  @ApiProperty({ format: 'date-time' })
  readonly verificadaHasta!: string;

  @ApiProperty({ example: 10 })
  readonly codigosDeRecuperacionRestantes!: number;
}
