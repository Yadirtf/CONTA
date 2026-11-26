import { and, asc, count, eq, gte, like, sql } from 'drizzle-orm';
import type { Identificacion } from '../../../../compartido/dominio/index.js';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { RepositorioClientes } from '../../aplicacion/puertos/repositorio-clientes.js';
import type { Cliente } from '../../dominio/clientes/index.js';
import { clienteDeFila, filaNuevaDe } from './cliente-de-fila.js';
import { clientes } from './tablas-catalogo.js';

/** La empresa de la transacción, fijada por la unidad de trabajo. Así el código nunca escribe una empresa a mano. */
const EMPRESA_DE_LA_TRANSACCION = sql`conta_sistema.empresa_actual()`;

// Corre en la transacción de una empresa: RLS solo deja ver y escribir sus clientes, así que no filtra por
// empresa a mano (un filtro de más escondería un error de la política en las pruebas).
export class RepositorioClientesPostgres implements RepositorioClientes {
  constructor(private readonly ejecutor: Ejecutor) {}

  async buscarPorPrefijo(prefijo: string, limite: number): Promise<Cliente[]> {
    // El prefijo trae solo letras y dígitos (TerminoDeBusqueda): no hay comodines que escapar. Va como parámetro.
    const filas = await this.ejecutor
      .select()
      .from(clientes)
      .where(like(clientes.numero, `${prefijo}%`))
      .orderBy(asc(clientes.numero), asc(clientes.tipoIdentificacion))
      .limit(limite);
    return filas.map(clienteDeFila);
  }

  async conIdentificacion(identificacion: Identificacion): Promise<Cliente | null> {
    const [fila] = await this.ejecutor
      .select()
      .from(clientes)
      .where(and(eq(clientes.tipoIdentificacion, identificacion.tipo), eq(clientes.numero, identificacion.numero)))
      .limit(1);
    return fila ? clienteDeFila(fila) : null;
  }

  async bloquearAltas(): Promise<void> {
    // Candado de transacción por empresa: se suelta solo al terminar. hashtextextended da la llave de 64 bits.
    await this.ejecutor.execute(sql`select pg_advisory_xact_lock(hashtextextended('conta.clientes:' || ${EMPRESA_DE_LA_TRANSACCION}::text, 0))`);
  }

  async contarCreadosDesde(fecha: Date): Promise<number> {
    const [fila] = await this.ejecutor.select({ cuantos: count() }).from(clientes).where(gte(clientes.creadoEn, fecha));
    return fila?.cuantos ?? 0;
  }

  async agregarSiNoExiste(cliente: Cliente): Promise<boolean> {
    // ON CONFLICT DO NOTHING: un choque no aborta la transacción, y el caso de uso puede leer al ganador.
    const insertadas = await this.ejecutor
      .insert(clientes)
      .values({ ...filaNuevaDe(cliente), empresaId: EMPRESA_DE_LA_TRANSACCION })
      .onConflictDoNothing()
      .returning({ id: clientes.id });
    return insertadas.length === 1;
  }
}
