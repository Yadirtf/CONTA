import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ContextoDeMiembro } from '../../../../../compartido/aplicacion/index.js';
import { LimitadorPorVentana } from '../../../../../compartido/presentacion/limites/limitador-por-ventana.js';

const CINCO_MINUTOS = 5 * 60 * 1000;

/**
 * Dibujar un PDF gasta CPU en una API gratuita: 30 comprobantes cada 5 minutos por persona y empresa. Un mostrador
 * comparte uno por venta; quien los pide en bucle, no.
 */
export const MAXIMO_DE_COMPROBANTES = 30;

@Injectable()
export class LimiteDeComprobantes {
  private readonly limitador = new LimitadorPorVentana(MAXIMO_DE_COMPROBANTES, CINCO_MINUTOS);

  exigir(miembro: ContextoDeMiembro): void {
    if (this.limitador.admitir(`${miembro.empresaId.valor}:${miembro.usuarioId.valor}`)) return;
    throw new HttpException(
      { codigo: 'comprobante.limite', mensaje: 'Pediste muchas facturas seguidas. Espera unos minutos.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
