import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MEDIOS_DE_PAGO, type MedioDePago, PREFERENCIAS_DE_DOCUMENTO, type PreferenciaDeDocumento } from '../../../dominio/index.js';

export class LineaPedida {
  @ApiProperty({ format: 'uuid', description: 'Producto del catálogo de la empresa: el precio y el IVA salen de ahí.' })
  readonly productoId!: string;

  @ApiProperty({ example: '2', description: 'Mayor que cero, hasta 1.000.000, con punto decimal y hasta 6 decimales.' })
  readonly cantidad!: string;
}

/** Una venta en el mostrador (HU-06.01). No lleva precios ni impuestos: los pone la API. */
export class NuevaVenta {
  @ApiProperty({ format: 'uuid', description: 'Lo elige la app: repetir la petición con el mismo id no crea dos ventas.' })
  readonly id!: string;

  @ApiProperty({ type: [LineaPedida], description: 'De 1 a 100 productos distintos.' })
  readonly lineas!: LineaPedida[];

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Comprador del catálogo. Si no viene: consumidor final.' })
  readonly compradorId?: string | null;

  @ApiProperty({ enum: MEDIOS_DE_PAGO, description: 'Nequi y Daviplata van como transferencia.' })
  readonly medioDePago!: MedioDePago;

  @ApiPropertyOptional({
    enum: PREFERENCIAS_DE_DOCUMENTO,
    default: 'automatico',
    description:
      'automatico: tiquete POS electrónico si es a consumidor final, el negocio lo tiene habilitado y no pasa de 5 UVT sin impuestos; si no, factura. factura: el comprador pidió factura electrónica.',
  })
  readonly documento?: PreferenciaDeDocumento;
}
