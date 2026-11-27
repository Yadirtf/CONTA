import { ApiProperty } from '@nestjs/swagger';
import type { VentaReciente } from '../../../aplicacion/consultas/listar-ventas-recientes.js';
import { CLASES_DE_DOCUMENTO, type ClaseDeDocumento, type EstadoDeLaVenta } from '../../../dominio/index.js';

const ESTADOS: readonly EstadoDeLaVenta[] = ['pendiente', 'aceptada', 'rechazada'];

/** Una fila de «Mis ventas». */
export class RespuestaVentaReciente {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'SETP990000123' })
  readonly numero!: string;

  @ApiProperty({ enum: CLASES_DE_DOCUMENTO, description: 'factura (factura electrónica) o pos (tiquete POS electrónico).' })
  readonly documento!: ClaseDeDocumento;

  @ApiProperty({ example: '2026-11-27T15:04:05.000Z' })
  readonly emitidaEn!: string;

  @ApiProperty({ example: 'Consumidor final' })
  readonly comprador!: string;

  @ApiProperty({ example: '7500.00', description: 'Lo que pagó el comprador, con IVA.' })
  readonly total!: string;

  @ApiProperty({ enum: ESTADOS, description: 'pendiente (va a la DIAN), aceptada (se puede compartir) o rechazada.' })
  readonly estado!: EstadoDeLaVenta;
}

export function respuestaDeVentaReciente(v: VentaReciente): RespuestaVentaReciente {
  return {
    id: v.id,
    numero: v.numero,
    documento: v.clase,
    emitidaEn: v.emitidaEn.toISOString(),
    comprador: v.comprador,
    total: v.total,
    estado: v.estado,
  };
}
