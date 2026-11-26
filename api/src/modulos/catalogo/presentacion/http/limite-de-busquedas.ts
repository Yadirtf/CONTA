import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { LimitadorPorVentana } from '../../../../compartido/presentacion/limites/limitador-por-ventana.js';

const CINCO_MINUTOS = 5 * 60 * 1000;
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Búsquedas de compradores por persona y empresa: 60 cada 5 minutos y 400 al día (hallazgos H5 y N3 de la
 * prueba de ataque). Un cajero en el mostrador no llega; quien recorre los prefijos para sacar la lista entera,
 * sí. Cuentan también los «crear» que chocan con un documento existente, que dicen quién es (hallazgo N1).
 * Riesgo que queda: alguien con permiso de vender puede ver nombres y documentos de su propia empresa a ese ritmo.
 */
export const MAXIMO_DE_BUSQUEDAS = 60;
export const MAXIMO_DE_BUSQUEDAS_POR_DIA = 400;

@Injectable()
export class LimiteDeBusquedas {
  private readonly porRafaga = new LimitadorPorVentana(MAXIMO_DE_BUSQUEDAS, CINCO_MINUTOS);
  private readonly porDia = new LimitadorPorVentana(MAXIMO_DE_BUSQUEDAS_POR_DIA, UN_DIA);

  exigir(miembro: ContextoDeMiembro): void {
    const llave = `${miembro.empresaId.valor}:${miembro.usuarioId.valor}`;
    // Las dos cuentan siempre, para que la del día no se salte cuando la ráfaga ya está llena.
    const dentroDeLaRafaga = this.porRafaga.admitir(llave);
    const dentroDelDia = this.porDia.admitir(llave);
    if (dentroDeLaRafaga && dentroDelDia) return;
    throw new HttpException(
      { codigo: 'cliente.limite-de-busquedas', mensaje: 'Hiciste muchas búsquedas seguidas. Espera unos minutos.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
