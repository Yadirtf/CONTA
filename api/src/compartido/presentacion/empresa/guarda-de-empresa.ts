import { createParamDecorator, Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { ContextoEmpresa } from '../../aplicacion/index.js';
import { excepcionDe } from './rechazos-de-empresa.js';
import { RESOLUTOR_DE_EMPRESA, type PeticionHttp, type ResolutorDeEmpresa } from './resolutor-de-empresa.js';

const CLAVE = Symbol('contextoEmpresa');
type PeticionConEmpresa = PeticionHttp & { [CLAVE]?: ContextoEmpresa };

/** Exige que la petición pertenezca a una empresa y la deja lista para @EmpresaDeLaPeticion(). */
@Injectable()
export class GuardaDeEmpresa implements CanActivate {
  constructor(@Inject(RESOLUTOR_DE_EMPRESA) private readonly resolutor: ResolutorDeEmpresa) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<PeticionConEmpresa>();
    const resolucion = await this.resolutor.resolver(peticion);
    if ('rechazo' in resolucion) throw excepcionDe(resolucion.rechazo);
    peticion[CLAVE] = resolucion.contexto;
    return true;
  }
}

/** Contexto de empresa de la petición. Solo se usa en controladores protegidos con GuardaDeEmpresa. */
export const EmpresaDeLaPeticion = createParamDecorator((_dato: unknown, contexto: ExecutionContext): ContextoEmpresa => {
  const empresa = contexto.switchToHttp().getRequest<PeticionConEmpresa>()[CLAVE];
  // Si falta es un error de programación (endpoint sin la guarda): nunca se sigue sin empresa.
  if (!empresa) throw new Error('Endpoint sin GuardaDeEmpresa: no hay contexto de empresa');
  return empresa;
});
