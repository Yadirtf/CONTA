import type { BusquedaDeProductos, Producto } from '../../dominio/productos/index.js';

/**
 * Productos de la empresa de la transacción. Como con los clientes, RLS limita todo a esa empresa: ningún método
 * recibe una empresa.
 */
export interface RepositorioProductos {
  conId(id: string): Promise<Producto | null>;
  /** Para vender (HU-06.01): los que existan de esos ids, en cualquier orden. */
  conIds(ids: readonly string[]): Promise<Producto[]>;
  /** Hasta `limite`, ordenados por nombre: los que contienen el nombre buscado o cuyo código empieza así. */
  buscar(busqueda: BusquedaDeProductos, limite: number): Promise<Producto[]>;
  /** Candado de altas de productos de la empresa hasta el final de la transacción (tope diario sin carreras). */
  bloquearAltas(): Promise<void>;
  contarCreadosDesde(fecha: Date): Promise<number>;
  /**
   * Gasta una alta del cupo diario de la persona, que suma todas sus empresas. Devuelve false, sin gastar nada, si
   * ya usó `maximo` hoy. Corre en la misma transacción: si el alta no se guarda, el cupo vuelve.
   */
  consumirCupoDePersona(usuarioId: string, maximo: number): Promise<boolean>;
  /** Lo guarda si no choca con otro (mismo id o mismo código). Devuelve false si chocó. */
  agregarSiNoExiste(producto: Producto): Promise<boolean>;
}
