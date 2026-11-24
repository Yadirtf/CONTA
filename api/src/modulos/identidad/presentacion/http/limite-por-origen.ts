import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Límite de peticiones por dirección IP, en memoria y por ventana fija. Es una capa más: los límites que
 * importan (por celular) viven en la base. Con una sola instancia basta; detrás de Render la IP viene de
 * X-Forwarded-For (configurar-app activa trust proxy).
 */
export class LimitadorPorOrigen {
  private readonly cuentas = new Map<string, number>();
  private ventanaDesde = 0;

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** true si la petición entra; false si el origen ya gastó su cupo en esta ventana. */
  admitir(origen: string): boolean {
    const ahora = this.ahora();
    if (ahora - this.ventanaDesde >= this.ventanaMs) {
      this.cuentas.clear();
      this.ventanaDesde = ahora;
    }
    const cuenta = (this.cuentas.get(origen) ?? 0) + 1;
    this.cuentas.set(origen, cuenta);
    return cuenta <= this.maximo;
  }
}

const DIEZ_MINUTOS = 10 * 60 * 1000;

/** 20 peticiones de acceso por IP cada 10 minutos: alcanza para una familia o un negocio detrás del mismo wifi. */
@Injectable()
export class GuardaDeLimitePorOrigen implements CanActivate {
  private readonly limitador = new LimitadorPorOrigen(20, DIEZ_MINUTOS);

  canActivate(contexto: ExecutionContext): boolean {
    const { ip } = contexto.switchToHttp().getRequest<{ ip?: string }>();
    if (this.limitador.admitir(ip ?? 'desconocido')) return true;
    throw new HttpException({ codigo: 'acceso.limite', mensaje: 'Demasiados intentos desde esta red. Intenta más tarde.' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
