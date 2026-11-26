import { eq, sql } from 'drizzle-orm';
import type { IdUsuario } from '../../../../compartido/dominio/index.js';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { membresias } from '../../../../compartido/infraestructura/persistencia/esquema.js';
import type { RepositorioMembresias } from '../../aplicacion/puertos/repositorio-membresias.js';
import type { Membresia } from '../../dominio/membresia.js';

// Corre en la transacción de una empresa: RLS solo deja ver y escribir membresías de esa empresa.
export class RepositorioMembresiasPostgres implements RepositorioMembresias {
  constructor(private readonly ejecutor: Ejecutor) {}

  async esMiembro(usuarioId: IdUsuario): Promise<boolean> {
    const [fila] = await this.ejecutor
      .select({ uno: sql<number>`1` })
      .from(membresias)
      .where(eq(membresias.usuarioId, usuarioId.valor))
      .limit(1);
    return fila !== undefined;
  }

  async agregar(membresia: Membresia): Promise<void> {
    await this.ejecutor.insert(membresias).values({
      empresaId: membresia.empresaId.valor,
      usuarioId: membresia.usuarioId.valor,
      creadaEn: membresia.creadaEn,
    });
  }
}
