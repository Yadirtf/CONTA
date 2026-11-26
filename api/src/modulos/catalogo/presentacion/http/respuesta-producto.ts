import { ApiProperty } from '@nestjs/swagger';
import { TIPOS_DE_IVA, type TipoDeIva } from '../../../../compartido/dominio/index.js';
import { type Producto, UNIDADES_DE_MEDIDA, type UnidadDeMedida } from '../../dominio/productos/index.js';

export class IvaDelProducto {
  @ApiProperty({ enum: TIPOS_DE_IVA })
  readonly tipo!: TipoDeIva;

  @ApiProperty({ nullable: true, example: '19', description: '19 o 5 si es gravado; 0 si es exento; null si es excluido.' })
  readonly tarifa!: string | null;
}

/** Lo que paga el comprador por una unidad, separado en base e IVA por la API (la app no calcula impuestos). */
export class PrecioDeUnaUnidad {
  @ApiProperty({ example: '2500.00', description: 'Precio de venta con IVA incluido.' })
  readonly total!: string;

  @ApiProperty({ example: '2100.84' })
  readonly base!: string;

  @ApiProperty({ example: '399.16' })
  readonly iva!: string;
}

export class RespuestaProducto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'Gaseosa 400 ml' })
  readonly nombre!: string;

  @ApiProperty({ nullable: true })
  readonly codigo!: string | null;

  @ApiProperty({ enum: Object.keys(UNIDADES_DE_MEDIDA) })
  readonly unidad!: UnidadDeMedida;

  @ApiProperty({ type: IvaDelProducto })
  readonly iva!: IvaDelProducto;

  @ApiProperty({ type: PrecioDeUnaUnidad })
  readonly precio!: PrecioDeUnaUnidad;
}

export class RespuestaListaDeProductos {
  @ApiProperty({ type: [RespuestaProducto], description: 'Hasta 50, ordenados por nombre.' })
  readonly productos!: RespuestaProducto[];
}

export function respuestaDeProducto(producto: Producto): RespuestaProducto {
  const { datos } = producto;
  const unaUnidad = producto.venta('1');
  return {
    id: datos.id,
    nombre: datos.nombre,
    codigo: datos.codigo,
    unidad: datos.unidad,
    iva: { tipo: datos.iva.tipo, tarifa: datos.iva.tarifa },
    precio: { total: unaUnidad.total.aTexto(), base: unaUnidad.base.aTexto(), iva: unaUnidad.iva.aTexto() },
  };
}
