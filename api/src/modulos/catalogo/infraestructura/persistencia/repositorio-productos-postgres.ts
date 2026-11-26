import { asc, count, eq, gte, like, or, type SQL, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { RepositorioProductos } from '../../aplicacion/puertos/repositorio-productos.js';
import type { BusquedaDeProductos, Producto } from '../../dominio/productos/index.js';
import { empresaDeLaTransaccion } from './empresa-de-la-transaccion.js';
import { filaNuevaDeProducto, productoDeFila } from './producto-de-fila.js';
import { productos } from './tablas-catalogo.js';

// Corre en la transacción de una empresa: RLS solo deja ver y escribir sus productos, así que no filtra por
// empresa a mano (un filtro de más escondería un error de la política en las pruebas).
export class RepositorioProductosPostgres implements RepositorioProductos {
  constructor(private readonly ejecutor: Ejecutor) {}

  async conId(id: string): Promise<Producto | null> {
    const [fila] = await this.ejecutor.select().from(productos).where(eq(productos.id, id)).limit(1);
    return fila ? productoDeFila(fila) : null;
  }

  async buscar(busqueda: BusquedaDeProductos, limite: number): Promise<Producto[]> {
    const filas = await this.ejecutor
      .select()
      .from(productos)
      .where(filtroDe(busqueda))
      .orderBy(asc(productos.nombreBusqueda), asc(productos.id))
      .limit(limite);
    return filas.map(productoDeFila);
  }

  async bloquearAltas(): Promise<void> {
    await this.ejecutor.execute(sql`select pg_advisory_xact_lock(hashtextextended('conta.productos:' || ${empresaDeLaTransaccion}::text, 0))`);
  }

  async contarCreadosDesde(fecha: Date): Promise<number> {
    const [fila] = await this.ejecutor.select({ cuantos: count() }).from(productos).where(gte(productos.creadoEn, fecha));
    return fila?.cuantos ?? 0;
  }

  async consumirCupoDePersona(usuarioId: string, maximo: number): Promise<boolean> {
    // Un solo UPSERT atómico: dos altas a la vez no pasan el cupo. El día es el de Colombia.
    const { rows } = await this.ejecutor.execute(sql`
      insert into conta_sistema.cupos_diarios as c (usuario_id, recurso, dia, usados)
      values (${usuarioId}, 'productos', (now() at time zone 'America/Bogota')::date, 1)
      on conflict (usuario_id, recurso, dia) do update set usados = c.usados + 1 where c.usados < ${maximo}
      returning c.usados`);
    return rows.length === 1;
  }

  async agregarSiNoExiste(producto: Producto): Promise<boolean> {
    const insertadas = await this.ejecutor
      .insert(productos)
      .values({ ...filaNuevaDeProducto(producto), empresaId: empresaDeLaTransaccion })
      .onConflictDoNothing()
      .returning({ id: productos.id });
    return insertadas.length === 1;
  }
}

/**
 * El nombre normalizado solo trae a-z, dígitos y espacios (nombreParaBuscar): no hay comodines de LIKE. El código
 * puede traer «_», que en LIKE es comodín, así que se compara con left() en vez de LIKE. Todo va como parámetro.
 */
function filtroDe({ nombre, codigo }: BusquedaDeProductos): SQL | undefined {
  const porNombre = nombre.length > 0 ? like(productos.nombreBusqueda, `%${nombre}%`) : undefined;
  const porCodigo = codigo === null ? undefined : sql`left(${productos.codigo}, ${codigo.length}) = ${codigo}`;
  return porNombre && porCodigo ? or(porNombre, porCodigo) : (porNombre ?? porCodigo);
}
