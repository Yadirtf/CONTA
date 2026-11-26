import {
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { SesionVigente } from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { SesionDelToken } from '../../aplicacion/consultas/sesion-del-token.js';
import { tokenDeLaPeticion } from './token-de-la-peticion.js';

const CLAVE = Symbol('sesion');
type Peticion = { headers: Record<string, string | string[] | undefined>; [CLAVE]?: SesionVigente };

/** Exige «Authorization: Bearer <token>» de una sesión vigente y la deja lista para @SesionDeLaPeticion(). */
@Injectable()
export class GuardaDeSesion implements CanActivate {
  constructor(private readonly sesionDelToken: SesionDelToken) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<Peticion>();
    const token = tokenDeLaPeticion(peticion.headers);
    const sesion = token ? await this.sesionDelToken.ejecutar(token) : null;
    if (!sesion) throw new UnauthorizedException({ codigo: 'acceso.sin-sesion', mensaje: 'Inicia sesión otra vez' });
    peticion[CLAVE] = sesion;
    return true;
  }
}

/** Sesión de la petición. Solo en endpoints protegidos con GuardaDeSesion. */
export const SesionDeLaPeticion = createParamDecorator((_dato: unknown, contexto: ExecutionContext): SesionVigente => {
  const sesion = contexto.switchToHttp().getRequest<Peticion>()[CLAVE];
  if (!sesion) throw new Error('Endpoint sin GuardaDeSesion: no hay sesión');
  return sesion;
});
