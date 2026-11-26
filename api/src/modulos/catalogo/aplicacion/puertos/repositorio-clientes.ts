import type { Identificacion } from '../../../../compartido/dominio/index.js';
import type { Cliente } from '../../dominio/clientes/index.js';

/**
 * Compradores de la empresa de la transacción. RLS ya limita todo a esa empresa: ningún método recibe una
 * empresa, así que no hay forma de pedir los de otra.
 */
export interface RepositorioClientes {
  /** Los primeros `limite` cuyo número de documento empieza por `prefijo`, ordenados por número. */
  buscarPorPrefijo(prefijo: string, limite: number): Promise<Cliente[]>;
  conIdentificacion(identificacion: Identificacion): Promise<Cliente | null>;
  /**
   * Bloquea hasta el final de la transacción las altas de compradores de la empresa, para que contar y
   * guardar no se crucen con otra petición y el tope diario no se pase (hallazgo H6 de la prueba de ataque).
   */
  bloquearAltas(): Promise<void>;
  contarCreadosDesde(fecha: Date): Promise<number>;
  /** Lo guarda si no choca con otro (mismo id o mismo documento). Devuelve false si chocó. */
  agregarSiNoExiste(cliente: Cliente): Promise<boolean>;
}

export interface RepositoriosDeCatalogo {
  readonly clientes: RepositorioClientes;
}
