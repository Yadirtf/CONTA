import { ErrorDominio } from '../../../compartido/dominio/index.js';
import type { Celular } from './celular.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Identificador de una persona usuaria. Es global: la misma persona puede pertenecer a varias empresas (HU-04.02). */
export class IdUsuario {
  private constructor(readonly valor: string) {}

  static de(valor: string): IdUsuario {
    const normal = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
    if (!UUID.test(normal)) throw new ErrorDominio('usuario.id-invalido', 'El identificador de usuario no es válido');
    return new IdUsuario(normal);
  }
}

/** Persona que entra a CONTA. Se registra sola la primera vez que verifica su celular. */
export interface Usuario {
  readonly id: IdUsuario;
  readonly celular: Celular;
  readonly creadoEn: Date;
}
