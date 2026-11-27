// Doble en memoria del catálogo: cada transacción ve solo los clientes de su empresa, como con RLS, y la
// unicidad por documento y por id es la de la tabla. La concurrencia real se prueba en las e2e.
import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../src/compartido/aplicacion/index.js';
import type { Identificacion } from '../../../src/compartido/dominio/index.js';
import type { RepositorioClientes } from '../../../src/modulos/catalogo/aplicacion/puertos/repositorio-clientes.js';
import type { RepositoriosDeCatalogo } from '../../../src/modulos/catalogo/aplicacion/puertos/repositorios-de-catalogo.js';
import type { Cliente } from '../../../src/modulos/catalogo/dominio/clientes/index.js';
import { ProductosEnMemoria } from './productos-en-memoria.js';

interface Guardado {
  readonly empresaId: string;
  readonly cliente: Cliente;
}

export class CatalogoEnMemoria implements UnidadDeTrabajo<RepositoriosDeCatalogo> {
  readonly guardados: Guardado[] = [];
  /** Se llama justo antes de insertar: simula otra petición que gana la carrera. */
  antesDeInsertar: (() => void) | null = null;
  /** Veces que se pidió el candado de altas. */
  bloqueos = 0;
  readonly productos = new ProductosEnMemoria();

  ejecutar<T>(contexto: ContextoEmpresa, trabajo: (r: RepositoriosDeCatalogo) => Promise<T>): Promise<T> {
    const empresaId = contexto.empresaId.valor;
    return trabajo({ clientes: this.repositorio(empresaId), productos: this.productos.de(empresaId) });
  }

  guardar(empresaId: string, cliente: Cliente): void {
    this.guardados.push({ empresaId, cliente });
  }

  private repositorio(empresaId: string): RepositorioClientes {
    const deLaEmpresa = () => this.guardados.filter((g) => g.empresaId === empresaId).map((g) => g.cliente);
    const conIdentificacion = (identificacion: Identificacion) =>
      deLaEmpresa().find((c) => c.identificacion.esIgualA(identificacion)) ?? null;
    return {
      buscarPorPrefijo: (prefijo, limite) =>
        Promise.resolve(
          deLaEmpresa()
            .filter((c) => c.identificacion.numero.startsWith(prefijo))
            .sort((a, b) => a.identificacion.numero.localeCompare(b.identificacion.numero))
            .slice(0, limite),
        ),
      bloquearAltas: () => {
        this.bloqueos++;
        return Promise.resolve();
      },
      conIdentificacion: (identificacion) => Promise.resolve(conIdentificacion(identificacion)),
      conId: (id) => Promise.resolve(deLaEmpresa().find((c) => c.id === id) ?? null),
      contarCreadosDesde: (fecha) => Promise.resolve(deLaEmpresa().filter((c) => c.datos.creadoEn >= fecha).length),
      agregarSiNoExiste: (cliente) => {
        this.antesDeInsertar?.();
        const choca = deLaEmpresa().some((c) => c.id === cliente.id) || conIdentificacion(cliente.identificacion) !== null;
        if (!choca) this.guardar(empresaId, cliente);
        return Promise.resolve(!choca);
      },
    };
  }
}
