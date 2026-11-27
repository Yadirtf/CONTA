import { ApiProperty } from '@nestjs/swagger';
import type { VentaConEstado } from '../../../aplicacion/consultas/consultar-venta.js';
import type { EstadoDeLaVenta } from '../../../dominio/index.js';

const ESTADOS: readonly EstadoDeLaVenta[] = ['pendiente', 'aceptada', 'rechazada'];

/** Lo que dice cada estado en el modo simple. */
const MENSAJES: Readonly<Record<EstadoDeLaVenta, string>> = {
  pendiente: 'Guardada. Se está enviando a la DIAN.',
  aceptada: 'La DIAN la aprobó.',
  rechazada: 'La DIAN no la aceptó.',
};

export class RespuestaVenta {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'SETP990000123', description: 'Número de la factura: prefijo y consecutivo de la resolución.' })
  readonly numero!: string;

  @ApiProperty({ example: '2026-11-27T15:04:05.000Z' })
  readonly emitidaEn!: string;

  @ApiProperty({ example: 'Consumidor final' })
  readonly comprador!: string;

  @ApiProperty({ example: '7500.00', description: 'Lo que pagó el comprador, con IVA.' })
  readonly total!: string;

  @ApiProperty({ example: '1197.48' })
  readonly iva!: string;

  @ApiProperty({ enum: ESTADOS, description: 'pendiente (guardada, va a la DIAN), aceptada o rechazada.' })
  readonly estado!: EstadoDeLaVenta;

  @ApiProperty({ example: 'Guardada. Se está enviando a la DIAN.' })
  readonly mensaje!: string;

  @ApiProperty({ type: [String], description: 'Por qué la DIAN la rechazó; vacío en los demás estados.' })
  readonly motivos!: string[];
}

export function respuestaDeVenta({ venta, estado, motivos }: VentaConEstado): RespuestaVenta {
  const { datos } = venta;
  return {
    id: datos.id,
    numero: datos.numero.aTexto(),
    emitidaEn: datos.emitidaEn.toISOString(),
    comprador: datos.comprador.razonSocial,
    total: venta.total.aTexto(),
    iva: venta.iva.aTexto(),
    estado,
    mensaje: MENSAJES[estado],
    motivos: [...motivos],
  };
}
