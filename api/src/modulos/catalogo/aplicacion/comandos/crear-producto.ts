import type { ContextoDeMiembro, Reloj, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { ErrorDominio, exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import { UN_DIA_EN_MS } from '../../dominio/clientes/index.js';
import {
  comprobarCupoDePersona,
  comprobarQuePuedeCrearProductos,
  type DatosDeProductoNuevo,
  MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA,
  Producto,
} from '../../dominio/productos/index.js';
import type { RepositoriosDeCatalogo } from '../puertos/repositorios-de-catalogo.js';

export interface ProductoCreado {
  readonly producto: Producto;
  /** false si el id ya era de este producto (la misma petición repetida): se devuelve el guardado sin cambiarlo. */
  readonly creado: boolean;
}

/**
 * Crea un producto con su precio e IVA (HU-05.02). Lo pide Permiso.GestionarProductos: el cajero vende, pero no
 * fija precios ni decide si un producto cobra IVA. Es idempotente por el id que elige la app.
 */
export class CrearProducto {
  constructor(
    private readonly catalogo: UnidadDeTrabajo<RepositoriosDeCatalogo>,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, datos: DatosDeProductoNuevo): Promise<ProductoCreado> {
    exigirPermiso(contexto.rol, Permiso.GestionarProductos);
    const ahora = this.reloj.ahora();
    const nuevo = Producto.crear(datos, contexto.usuarioId.valor, ahora);
    return this.catalogo.ejecutar(contexto, async ({ productos }) => {
      await productos.bloquearAltas();
      const mismo = await productos.conId(nuevo.id);
      if (mismo) return { producto: mismo, creado: false };
      comprobarQuePuedeCrearProductos(await productos.contarCreadosDesde(new Date(ahora.getTime() - UN_DIA_EN_MS)));
      comprobarCupoDePersona(await productos.consumirCupoDePersona(contexto.usuarioId.valor, MAXIMO_DE_PRODUCTOS_POR_PERSONA_AL_DIA));
      if (await productos.agregarSiNoExiste(nuevo)) return { producto: nuevo, creado: true };
      // El candado ordena las altas de la empresa: si chocó y el id está libre, el código ya es de otro producto.
      const ganador = await productos.conId(nuevo.id);
      if (ganador) return { producto: ganador, creado: false };
      throw new ErrorDominio('producto.codigo-en-uso', 'Ese código ya es de otro producto');
    });
  }
}
