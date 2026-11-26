import { createParamDecorator, Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ContextoDeMiembro } from '../../aplicacion/index.js';
import { tienePermiso } from '../../dominio/index.js';
import { permisoDelEndpoint } from './permiso-del-endpoint.js';
import { excepcionDe } from './rechazos-de-empresa.js';
import { RESOLUTOR_DE_EMPRESA, type PeticionHttp, type ResolutorDeEmpresa } from './resolutor-de-empresa.js';

const CLAVE = Symbol('contextoDeMiembro');
type PeticionConEmpresa = PeticionHttp & { [CLAVE]?: ContextoDeMiembro };

/**
 * Exige que la petición pertenezca a una empresa y que el rol del miembro tenga el permiso del endpoint
 * (@Requiere). Deja el contexto listo para @EmpresaDeLaPeticion().
 */
@Injectable()
export class GuardaDeEmpresa implements CanActivate {
  constructor(
    @Inject(RESOLUTOR_DE_EMPRESA) private readonly resolutor: ResolutorDeEmpresa,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    // Primero el permiso del endpoint: si falta @Requiere, falla antes de tocar la base.
    const permiso = permisoDelEndpoint(this.reflector, contexto);
    const peticion = contexto.switchToHttp().getRequest<PeticionConEmpresa>();
    const resolucion = await this.resolutor.resolver(peticion);
    if ('rechazo' in resolucion) throw excepcionDe(resolucion.rechazo);
    if (!tienePermiso(resolucion.contexto.rol, permiso)) throw excepcionDe('sin-permiso');
    peticion[CLAVE] = resolucion.contexto;
    return true;
  }
}

/** Contexto del miembro de la petición. Solo se usa en controladores protegidos con GuardaDeEmpresa. */
export const EmpresaDeLaPeticion = createParamDecorator((_dato: unknown, contexto: ExecutionContext): ContextoDeMiembro => {
  const miembro = contexto.switchToHttp().getRequest<PeticionConEmpresa>()[CLAVE];
  // Si falta es un error de programación (endpoint sin la guarda): nunca se sigue sin empresa.
  if (!miembro) throw new Error('Endpoint sin GuardaDeEmpresa: no hay contexto de empresa');
  return miembro;
});
