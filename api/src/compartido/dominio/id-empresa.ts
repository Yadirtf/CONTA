import { ErrorDominio } from './error-dominio.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Identificador de una empresa (la llave del aislamiento multiempresa, HU-01.05). Siempre un uuid en minúsculas.
export class IdEmpresa {
  private constructor(readonly valor: string) {}

  static de(valor: string): IdEmpresa {
    const normal = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
    if (!UUID.test(normal)) throw new ErrorDominio('empresa.id-invalido', 'El identificador de empresa no es válido');
    return new IdEmpresa(normal);
  }

  esIgualA(otro: IdEmpresa): boolean {
    return this.valor === otro.valor;
  }

  toString(): string {
    return this.valor;
  }
}
