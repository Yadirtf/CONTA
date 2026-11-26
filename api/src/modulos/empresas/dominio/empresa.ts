import { ErrorDominio, type IdEmpresa, textoLimpio } from '../../../compartido/dominio/index.js';

/** Empresa cliente de CONTA. Raíz del aislamiento multiempresa (HU-01.05); sus datos crecen en EP-04. */
export class Empresa {
  private constructor(
    readonly id: IdEmpresa,
    readonly razonSocial: string,
  ) {}

  static crear(id: IdEmpresa, razonSocial: string): Empresa {
    // Sin controles ni caracteres invisibles: va como emisor en cada factura (hallazgo N4, prueba de ataque).
    const nombre = textoLimpio(razonSocial);
    if (nombre.length === 0 || nombre.length > 450) {
      throw new ErrorDominio('empresa.razon-social-invalida', 'La razón social debe tener entre 1 y 450 caracteres');
    }
    return new Empresa(id, nombre);
  }
}
