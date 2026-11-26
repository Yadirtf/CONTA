import { SetMetadata } from '@nestjs/common';
import type { Permiso } from '../../dominio/index.js';

export const CLAVE_DE_PERMISO = 'conta:permiso-requerido';

/**
 * Permiso que pide un endpoint dentro de una empresa (HU-04.03, ADR-0012). Todo endpoint protegido con
 * GuardaDeEmpresa debe declararlo: si falta, la guarda niega la petición (se niega por defecto).
 */
export const Requiere = (permiso: Permiso): MethodDecorator & ClassDecorator => SetMetadata(CLAVE_DE_PERMISO, permiso);
