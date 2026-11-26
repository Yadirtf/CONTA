import { asc, count, eq } from 'drizzle-orm';
import { esModo, esRol } from '../../../../compartido/dominio/index.js';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { empresas, membresias } from '../../../../compartido/infraestructura/persistencia/esquema.js';
import type { MiEmpresa, RepositorioDeMisEmpresas } from '../../aplicacion/puertos/repositorio-de-mis-empresas.js';
import { empresaDeFila } from './empresa-de-fila.js';

// Corre en una transacción del usuario (ADR-0011). No filtra por usuario a mano: las políticas
// *_del_usuario_actual ya lo hacen, y solo muestran membresías vigentes (sin retirar). Un filtro de más aquí
// escondería un error de la política en las pruebas.
export class RepositorioDeMisEmpresasPostgres implements RepositorioDeMisEmpresas {
  constructor(private readonly ejecutor: Ejecutor) {}

  async listar(): Promise<MiEmpresa[]> {
    const filas = await this.ejecutor
      .select({
        id: empresas.id,
        razonSocial: empresas.razonSocial,
        rol: membresias.rol,
        modo: membresias.modo,
        aceptadaEn: membresias.aceptadaEn,
      })
      .from(empresas)
      .innerJoin(membresias, eq(membresias.empresaId, empresas.id))
      .orderBy(asc(empresas.razonSocial), asc(empresas.id));
    return filas.map((fila) => {
      if (!esRol(fila.rol) || !esModo(fila.modo)) throw new Error(`Membresía en ${fila.id} con rol o modo desconocido`);
      return { empresa: empresaDeFila(fila), rol: fila.rol, modo: fila.modo, estado: fila.aceptadaEn ? 'activa' : 'invitada' };
    });
  }

  async contar(): Promise<number> {
    const [fila] = await this.ejecutor.select({ cuantas: count() }).from(membresias);
    return fila?.cuantas ?? 0;
  }
}
