import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TARIFAS_DE_GRAVADO, TIPOS_DE_IVA, type TipoDeIva } from '../../../../compartido/dominio/index.js';
import { UNIDADES_DE_MEDIDA, type UnidadDeMedida } from '../../dominio/productos/index.js';

/** Producto nuevo con su precio y su IVA (HU-05.02). */
export class NuevoProducto {
  @ApiProperty({ format: 'uuid', description: 'Lo elige la app: repetir la petición con el mismo id no crea dos.' })
  readonly id!: string;

  @ApiProperty({ example: 'Gaseosa 400 ml', description: 'Como va en la factura (1 a 300 caracteres).' })
  readonly nombre!: string;

  @ApiPropertyOptional({ nullable: true, example: '7702004003508', description: 'Código interno o de barras, único en la empresa.' })
  readonly codigo?: string | null;

  @ApiPropertyOptional({ enum: Object.keys(UNIDADES_DE_MEDIDA), example: '94', description: 'UN/ECE. Si no viene: 94 (unidad).' })
  readonly unidad?: UnidadDeMedida;

  @ApiProperty({ example: '2500', description: 'En pesos, con punto decimal y hasta 2 decimales. Mayor que cero.' })
  readonly precio!: string;

  @ApiPropertyOptional({ description: 'true (por defecto) si el precio ya trae el IVA. Con false se le suma y se guarda el final.' })
  readonly precioIncluyeIva?: boolean;

  @ApiProperty({ enum: TIPOS_DE_IVA, description: 'gravado (19 % o 5 %), exento (0 %) o excluido (no causa IVA).' })
  readonly tipoDeIva!: TipoDeIva;

  @ApiPropertyOptional({ enum: TARIFAS_DE_GRAVADO, nullable: true, description: 'Solo con gravado.' })
  readonly tarifaIva?: string | null;
}
