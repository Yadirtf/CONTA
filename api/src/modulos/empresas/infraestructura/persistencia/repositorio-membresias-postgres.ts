import { and, asc, count, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { ErrorDominio, type IdUsuario } from '../../../../compartido/dominio/index.js';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { membresias } from '../../../../compartido/infraestructura/persistencia/esquema.js';
import type { RepositorioMembresias } from '../../aplicacion/puertos/repositorio-membresias.js';
import type { Membresia } from '../../dominio/membresia.js';
import { cambiosDe, filaNuevaDe, membresiaDeFila } from './membresia-de-fila.js';

const VIOLACION_DE_UNICIDAD = '23505';
const vigente = isNull(membresias.retiradaEn);

// Corre en la transacción de una empresa: RLS solo deja ver y escribir membresías de esa empresa, así que no
// filtra por empresa a mano (un filtro de más escondería un error de la política en las pruebas).
export class RepositorioMembresiasPostgres implements RepositorioMembresias {
  constructor(private readonly ejecutor: Ejecutor) {}

  async vigenteDe(usuarioId: IdUsuario): Promise<Membresia | null> {
    const [fila] = await this.ejecutor.select().from(membresias).where(and(eq(membresias.usuarioId, usuarioId.valor), vigente)).limit(1);
    return fila ? membresiaDeFila(fila) : null;
  }

  async tomarVigente(usuarioId: IdUsuario): Promise<Membresia | null> {
    const [fila] = await this.ejecutor
      .select()
      .from(membresias)
      .where(and(eq(membresias.usuarioId, usuarioId.valor), vigente))
      .limit(1)
      .for('update');
    return fila ? membresiaDeFila(fila) : null;
  }

  async listarVigentes(): Promise<Membresia[]> {
    const filas = await this.ejecutor.select().from(membresias).where(vigente).orderBy(asc(membresias.creadaEn), asc(membresias.id));
    return filas.map(membresiaDeFila);
  }

  async contarVigentes(): Promise<number> {
    const [fila] = await this.ejecutor.select({ cuantas: count() }).from(membresias).where(vigente);
    return fila?.cuantas ?? 0;
  }

  async contarInvitacionesDesde(fecha: Date): Promise<number> {
    const [fila] = await this.ejecutor
      .select({ cuantas: count() })
      .from(membresias)
      .where(and(isNotNull(membresias.invitadaPor), gte(membresias.creadaEn, fecha)));
    return fila?.cuantas ?? 0;
  }

  async contarDuenosActivosBloqueando(): Promise<number> {
    // FOR UPDATE no admite count(): se bloquean las filas, en orden de id para no cruzarse con otra transacción.
    const filas = await this.ejecutor
      .select({ id: membresias.id })
      .from(membresias)
      .where(and(eq(membresias.rol, 'dueno'), isNotNull(membresias.aceptadaEn), vigente))
      .orderBy(asc(membresias.id))
      .for('update');
    return filas.length;
  }

  async agregar(membresia: Membresia): Promise<void> {
    try {
      await this.ejecutor.insert(membresias).values(filaNuevaDe(membresia));
    } catch (error) {
      if (codigoDe(error) === VIOLACION_DE_UNICIDAD) {
        throw new ErrorDominio('miembro.ya-esta', 'Esa persona ya está en la empresa o tiene una invitación');
      }
      throw error;
    }
  }

  async guardar(membresia: Membresia): Promise<void> {
    const { aceptadaEn, ...cambios } = cambiosDe(membresia);
    // La aceptación solo se escribe la primera vez: la fecha leída de JavaScript pierde los microsegundos de
    // PostgreSQL, y reescribirla la cambiaría (el disparador de la migración 0005 lo prohíbe).
    const aceptada = aceptadaEn ? sql`coalesce(${membresias.aceptadaEn}, ${aceptadaEn.toISOString()}::timestamptz)` : null;
    await this.ejecutor
      .update(membresias)
      .set({ ...cambios, aceptadaEn: aceptada })
      .where(eq(membresias.id, membresia.id));
  }
}

/** Código SQLSTATE de un error de pg, que Drizzle envuelve en `cause`. */
function codigoDe(error: unknown): string | undefined {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if ('code' in e && typeof e.code === 'string') return e.code;
  }
  return undefined;
}
