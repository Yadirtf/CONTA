import { timingSafeEqual } from 'node:crypto';
import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/** Largo mínimo del token: corto sería adivinable. */
const LARGO_MINIMO = 32;

/**
 * Solo deja pasar peticiones con «Authorization: Bearer <TOKEN_TRABAJOS_INTERNOS>». Sin token configurado,
 * el endpoint queda cerrado. La comparación toma el mismo tiempo acierte o no.
 */
@Injectable()
export class GuardaDeTrabajosInternos implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const esperado = process.env['TOKEN_TRABAJOS_INTERNOS'] ?? '';
    const cabecera = contexto.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers['authorization'];
    const recibido = cabecera?.startsWith('Bearer ') ? cabecera.slice('Bearer '.length) : '';
    if (esperado.length < LARGO_MINIMO || !iguales(recibido, esperado)) throw new UnauthorizedException();
    return true;
  }
}

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
