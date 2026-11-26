// Doble en memoria de los productos: cada transacción ve solo los de su empresa, como con RLS, y la unicidad por
// id y por código es la de la tabla. La concurrencia real se prueba contra PostgreSQL en las e2e.
import type { RepositorioProductos } from '../../../src/modulos/catalogo/aplicacion/puertos/repositorio-productos.js';
import type { Producto } from '../../../src/modulos/catalogo/dominio/productos/index.js';

interface Guardado {
  readonly empresaId: string;
  readonly producto: Producto;
}

export class ProductosEnMemoria {
  readonly guardados: Guardado[] = [];
  /** Se llama justo antes de insertar: simula otra petición que gana la carrera. */
  antesDeInsertar: (() => void) | null = null;
  bloqueos = 0;

  guardar(empresaId: string, producto: Producto): void {
    this.guardados.push({ empresaId, producto });
  }

  de(empresaId: string): RepositorioProductos {
    const deLaEmpresa = () => this.guardados.filter((g) => g.empresaId === empresaId).map((g) => g.producto);
    return {
      conId: (id) => Promise.resolve(deLaEmpresa().find((p) => p.id === id) ?? null),
      buscar: ({ nombre, codigo }, limite) =>
        Promise.resolve(
          deLaEmpresa()
            .filter((p) => (nombre === '' && codigo === null) || (nombre !== '' && p.nombreParaBuscar.includes(nombre)) || (codigo !== null && (p.datos.codigo ?? '').startsWith(codigo)))
            .sort((a, b) => a.nombreParaBuscar.localeCompare(b.nombreParaBuscar))
            .slice(0, limite),
        ),
      bloquearAltas: () => {
        this.bloqueos++;
        return Promise.resolve();
      },
      contarCreadosDesde: (fecha) => Promise.resolve(deLaEmpresa().filter((p) => p.datos.creadoEn >= fecha).length),
      agregarSiNoExiste: (producto) => {
        this.antesDeInsertar?.();
        const choca = deLaEmpresa().some((p) => p.id === producto.id || (producto.datos.codigo !== null && p.datos.codigo === producto.datos.codigo));
        if (!choca) this.guardar(empresaId, producto);
        return Promise.resolve(!choca);
      },
    };
  }
}
