import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LimitadorPorVentana } from '../../../../compartido/presentacion/limites/limitador-por-ventana.js';

// Detrás de Render la IP viene de X-Forwarded-For: configurar-app activa trust proxy con un solo salto, así
// que cuenta la IP que agrega el proxy de Render y no las que el cliente escriba antes.

const DIEZ_MINUTOS = 10 * 60 * 1000;

/** 20 peticiones de acceso por IP cada 10 minutos: alcanza para una familia o un negocio detrás del mismo wifi. */
@Injectable()
export class GuardaDeLimitePorOrigen implements CanActivate {
  private readonly limitador = new LimitadorPorVentana(20, DIEZ_MINUTOS);

  canActivate(contexto: ExecutionContext): boolean {
    const { ip } = contexto.switchToHttp().getRequest<{ ip?: string }>();
    if (this.limitador.admitir(ip ?? 'desconocido')) return true;
    throw new HttpException({ codigo: 'acceso.limite', mensaje: 'Demasiados intentos desde esta red. Intenta más tarde.' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
