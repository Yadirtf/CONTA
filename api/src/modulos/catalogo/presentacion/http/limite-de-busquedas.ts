import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { LimitadorPorVentana } from '../../../../compartido/presentacion/limites/limitador-por-ventana.js';

const CINCO_MINUTOS = 5 * 60 * 1000;

/**
 * 60 búsquedas de compradores por persona y empresa cada 5 minutos (hallazgo H5 de la prueba de ataque). Un
 * cajero que atiende en el mostrador no llega; quien recorre los prefijos para sacar la lista entera, sí.
 */
export const MAXIMO_DE_BUSQUEDAS = 60;

@Injectable()
export class LimiteDeBusquedas {
  private readonly limitador = new LimitadorPorVentana(MAXIMO_DE_BUSQUEDAS, CINCO_MINUTOS);

  exigir(miembro: ContextoDeMiembro): void {
    if (this.limitador.admitir(`${miembro.empresaId.valor}:${miembro.usuarioId.valor}`)) return;
    throw new HttpException(
      { codigo: 'cliente.limite-de-busquedas', mensaje: 'Hiciste muchas búsquedas seguidas. Espera unos minutos.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
