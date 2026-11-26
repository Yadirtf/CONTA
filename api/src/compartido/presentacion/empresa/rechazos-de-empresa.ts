import {
  BadRequestException,
  ForbiddenException,
  type HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CODIGO_SIN_PERMISO } from '../../dominio/index.js';
import type { RechazoDeEmpresa } from './resolutor-de-empresa.js';

/** Código estable con el que la app sabe que debe pedir el segundo factor (HU-04.04). */
export const CODIGO_SIN_SEGUNDO_FACTOR = 'acceso.segundo-factor-requerido';

/** Respuesta HTTP de cada rechazo, con un código estable. La empresa ajena responde igual que la inexistente. */
export function excepcionDe(rechazo: RechazoDeEmpresa): HttpException {
  switch (rechazo) {
    case 'sin-sesion':
      return new UnauthorizedException({ codigo: 'acceso.sin-sesion', mensaje: 'Inicia sesión otra vez' });
    case 'sin-empresa-elegida':
      return new BadRequestException({ codigo: 'empresa.sin-elegir', mensaje: 'Elige una de tus empresas' });
    case 'empresa-ajena':
      return new NotFoundException({ codigo: 'empresa.no-encontrada', mensaje: 'No encontramos esa empresa' });
    case 'sin-segundo-factor':
      return new ForbiddenException({ codigo: CODIGO_SIN_SEGUNDO_FACTOR, mensaje: 'Confirma que eres tú con tu app de verificación' });
    case 'sin-permiso':
      return new ForbiddenException({ codigo: CODIGO_SIN_PERMISO, mensaje: 'No tienes permiso' });
  }
}
