import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import { nombreParaBuscar } from './nombre-de-producto.js';

export const MAXIMO_DE_PRODUCTOS_POR_PAGINA = 50;
const LARGO_MAXIMO = 60;

/**
 * Lo que se escribe para encontrar un producto (HU-05.02): parte del nombre, sin importar tildes ni mayúsculas,
 * o el comienzo del código. Vacío lista los primeros por nombre. Los productos no son datos personales: listar el
 * catálogo propio es parte de vender.
 */
export class BusquedaDeProductos {
  private constructor(
    /** Texto normalizado como nombreParaBuscar; vacío si no se escribió nada. */
    readonly nombre: string,
    /** El mismo texto como comienzo de un código (mayúsculas, sin espacios), o null si no puede serlo. */
    readonly codigo: string | null,
  ) {}

  static de(texto: string): BusquedaDeProductos {
    if (texto.length > LARGO_MAXIMO) {
      throw new ErrorDominio('producto.busqueda-invalida', `Escribe hasta ${LARGO_MAXIMO} caracteres`);
    }
    const codigo = texto.trim().toUpperCase();
    return new BusquedaDeProductos(nombreParaBuscar(texto), /^[A-Z0-9._-]{1,40}$/.test(codigo) ? codigo : null);
  }

  get esListado(): boolean {
    return this.nombre.length === 0 && this.codigo === null;
  }
}
