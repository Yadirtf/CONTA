import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ContextoDeMiembro } from '../../../../../compartido/aplicacion/index.js';
import { LimitadorDeslizante } from '../../../../../compartido/presentacion/limites/limitador-deslizante.js';

const CINCO_MINUTOS = 5 * 60 * 1000;

/**
 * Dibujar un PDF gasta CPU en una API gratuita: 30 comprobantes en cualquier lapso de 5 minutos por persona y empresa
 * (ventana deslizante, hallazgo H7). Un mostrador comparte uno por venta; quien los pide en bucle, no.
 */
export const MAXIMO_DE_COMPROBANTES = 30;

interface ConCabeceras {
  setHeader(nombre: string, valor: string): unknown;
}

@Injectable()
export class LimiteDeComprobantes {
  private readonly limitador = new LimitadorDeslizante(MAXIMO_DE_COMPROBANTES, CINCO_MINUTOS);

  /** Si ya no hay cupo, responde 429 con Retry-After en segundos. */
  exigir(miembro: ContextoDeMiembro, respuesta: ConCabeceras): void {
    const espera = this.limitador.esperaPara(`${miembro.empresaId.valor}:${miembro.usuarioId.valor}`);
    if (espera === null) return;
    respuesta.setHeader('Retry-After', String(Math.ceil(espera / 1000)));
    throw new HttpException(
      { codigo: 'comprobante.limite', mensaje: 'Pediste muchas facturas seguidas. Espera unos minutos.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
