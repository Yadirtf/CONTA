import { ErrorDominio } from './error-dominio.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identificador de una persona usuaria (HU-04.01). Es global, no de una empresa: la misma persona puede
 * pertenecer a varias (HU-04.02). Vive en compartido porque identidad y empresas lo usan los dos.
 */
export class IdUsuario {
  private constructor(readonly valor: string) {}

  static de(valor: string): IdUsuario {
    const normal = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
    if (!UUID.test(normal)) throw new ErrorDominio('usuario.id-invalido', 'El identificador de usuario no es válido');
    return new IdUsuario(normal);
  }
}
