import { asc, count } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { empresas, membresias } from '../../../../compartido/infraestructura/persistencia/esquema.js';
import type { RepositorioDeMisEmpresas } from '../../aplicacion/puertos/repositorio-de-mis-empresas.js';
import type { Empresa } from '../../dominio/empresa.js';
import { empresaDeFila } from './empresa-de-fila.js';

// Corre en una transacción del usuario (ADR-0011). No filtra por usuario a mano: las políticas
// *_del_usuario_actual ya lo hacen, y un filtro de más escondería un error de la política en las pruebas.
export class RepositorioDeMisEmpresasPostgres implements RepositorioDeMisEmpresas {
  constructor(private readonly ejecutor: Ejecutor) {}

  async listar(): Promise<Empresa[]> {
    const filas = await this.ejecutor
      .select({ id: empresas.id, razonSocial: empresas.razonSocial })
      .from(empresas)
      .orderBy(asc(empresas.razonSocial), asc(empresas.id));
    return filas.map(empresaDeFila);
  }

  async contar(): Promise<number> {
    const [fila] = await this.ejecutor.select({ cuantas: count() }).from(membresias);
    return fila?.cuantas ?? 0;
  }
}
