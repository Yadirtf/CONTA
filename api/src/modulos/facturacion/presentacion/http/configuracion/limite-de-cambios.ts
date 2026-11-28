import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ContextoDeMiembro } from '../../../../../compartido/aplicacion/index.js';
import { LimitadorDeslizante } from '../../../../../compartido/presentacion/limites/limitador-deslizante.js';

const DIEZ_MINUTOS = 10 * 60 * 1000;

/**
 * Cambios de la configuración DIAN por empresa en cualquier lapso de 10 minutos (hallazgo B5 de HU-07.04). Configurar
 * todo de una vez toma menos de 10 cambios; una sesión robada no puede llenar la empresa de resoluciones imborrables ni
 * tapar la bitácora con cientos de cambios.
 */
export const MAXIMO_DE_CAMBIOS = 30;

export interface ConCabeceras {
  setHeader(nombre: string, valor: string): unknown;
}

@Injectable()
export class LimiteDeCambiosDeConfiguracion {
  private readonly limitador = new LimitadorDeslizante(MAXIMO_DE_CAMBIOS, DIEZ_MINUTOS);

  /** Si ya no hay cupo, responde 429 con Retry-After en segundos. */
  exigir(miembro: ContextoDeMiembro, respuesta: ConCabeceras): void {
    const espera = this.limitador.esperaPara(miembro.empresaId.valor);
    if (espera === null) return;
    respuesta.setHeader('Retry-After', String(Math.ceil(espera / 1000)));
    throw new HttpException(
      { codigo: 'configuracion.limite', mensaje: 'Hiciste muchos cambios seguidos. Espera unos minutos.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
