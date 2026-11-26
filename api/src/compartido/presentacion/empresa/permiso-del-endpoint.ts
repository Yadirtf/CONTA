import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Permiso } from '../../dominio/index.js';
import { CLAVE_DE_PERMISO } from './requiere.js';

/** Permiso que declara el método o, si no, su controlador. Lanza si ninguno lo declara: es un error de programación. */
export function permisoDelEndpoint(reflector: Reflector, contexto: ExecutionContext): Permiso {
  const permiso = reflector.getAllAndOverride<Permiso | undefined>(CLAVE_DE_PERMISO, [contexto.getHandler(), contexto.getClass()]);
  if (!permiso) throw new Error('Endpoint con GuardaDeEmpresa sin @Requiere(permiso): se niega por defecto');
  return permiso;
}
