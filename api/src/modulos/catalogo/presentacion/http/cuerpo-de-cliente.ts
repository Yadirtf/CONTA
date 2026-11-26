import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TIPOS_DE_IDENTIFICACION, type TipoDeIdentificacion } from '../../../../compartido/dominio/index.js';
import { TIPOS_DE_PERSONA, type TipoDePersona } from '../../dominio/clientes/index.js';

export class DireccionDeCliente {
  @ApiProperty({ example: '11001', description: 'Código DANE del municipio (5 dígitos).' })
  readonly codigoMunicipio!: string;

  @ApiProperty({ example: 'Bogotá D.C.' })
  readonly ciudad!: string;

  @ApiProperty({ example: 'Bogotá' })
  readonly departamento!: string;

  @ApiProperty({ example: 'Calle 12 # 3-45' })
  readonly linea!: string;
}

/** Comprador nuevo con los campos mínimos de la DIAN (HU-05.01). */
export class NuevoCliente {
  @ApiProperty({ format: 'uuid', description: 'Lo elige la app: repetir la petición con el mismo id no crea dos.' })
  readonly id!: string;

  @ApiProperty({ enum: Object.keys(TIPOS_DE_IDENTIFICACION), example: '13', description: '13 cédula, 31 NIT, 22 cédula de extranjería…' })
  readonly tipoDocumento!: TipoDeIdentificacion;

  @ApiProperty({ example: '900373076', description: 'Se aceptan puntos y espacios. Con NIT, «900373076-4» también sirve.' })
  readonly numero!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9, description: 'Si se escribe, debe coincidir con el calculado.' })
  readonly digitoVerificacion?: number;

  @ApiProperty({ example: 'Ferretería El Tornillo S.A.S.', description: 'Nombre de la persona o razón social.' })
  readonly nombre!: string;

  @ApiProperty({ enum: TIPOS_DE_PERSONA })
  readonly tipoDePersona!: TipoDePersona;

  @ApiPropertyOptional({ type: [String], example: ['O-13'], description: 'Del RUT (casilla 53). Si no viene: R-99-PN.' })
  readonly responsabilidadesFiscales?: string[];

  @ApiPropertyOptional({ description: 'Responsable de IVA. Si no viene: no.' })
  readonly responsableDeIva?: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'compras@eltornillo.co', description: 'Para mandarle la factura.' })
  readonly correo?: string | null;

  @ApiPropertyOptional({ type: DireccionDeCliente, nullable: true })
  readonly direccion?: DireccionDeCliente | null;
}
