import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../src/compartido/aplicacion/index.js';
import type { CatalogoDeVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/catalogo-de-venta.js';
import type { RepositoriosDeVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-venta.js';
import { type ArticuloDelCatalogo, type Participante, ResolucionDeNumeracion, type Venta } from '../../../../src/modulos/facturacion/dominio/index.js';
import { adquirenteDePrueba, emisorDePrueba } from '../datos-de-prueba.js';
import { arroz, gaseosa } from './apoyo.js';

/**
 * Ventas, numeración y cola de emisión en memoria, para probar las reglas de RegistrarVenta sin base de datos.
 * Las garantías de concurrencia y de permisos de PostgreSQL se prueban en test/integracion/ventas.
 */
export class VentasEnMemoria implements UnidadDeTrabajo<RepositoriosDeVenta> {
  emisor: Participante | null = emisorDePrueba();
  resolucion: ResolucionDeNumeracion | null = ResolucionDeNumeracion.crear({
    numero: '18760000001',
    prefijo: 'SETP',
    desde: 990000000,
    hasta: 990000002,
    vigenteDesde: '2019-01-19',
    vigenteHasta: '2030-01-19',
  });
  siguiente = 990000000;
  ventasDelDia = 0;
  cupoDePersonaAgotado = false;
  readonly guardadas = new Map<string, Venta>();
  readonly encoladas: string[] = [];

  ejecutar<T>(_contexto: ContextoEmpresa, trabajo: (r: RepositoriosDeVenta) => Promise<T>): Promise<T> {
    const antes = this.siguiente;
    return trabajo(this.repositorios()).catch((error: unknown) => {
      this.siguiente = antes; // La transacción se deshace con su número.
      throw error;
    });
  }

  private repositorios(): RepositoriosDeVenta {
    return {
      ventas: {
        conId: (id) => Promise.resolve(this.guardadas.has(id) ? { venta: this.guardadas.get(id) as Venta, resolucionId: 'r' } : null),
        huellaDe: (id) => Promise.resolve(this.guardadas.get(id)?.datos.huella ?? null),
        guardar: (venta) => {
          if (this.guardadas.has(venta.id)) return Promise.resolve(false);
          this.guardadas.set(venta.id, venta);
          return Promise.resolve(true);
        },
        contarDesde: () => Promise.resolve(this.ventasDelDia),
        consumirCupoDePersona: () => Promise.resolve(!this.cupoDePersonaAgotado),
        registrarEmision: () => Promise.resolve(),
        envioDe: () => Promise.resolve(null),
      },
      numeracion: {
        emisor: () => Promise.resolve(this.emisor),
        resolucionVigente: () => Promise.resolve(this.resolucion && { id: 'r', resolucion: this.resolucion }),
        resolucion: () => Promise.resolve(this.resolucion),
        reservarConsecutivo: () => {
          if (this.siguiente > 990000002) return Promise.resolve(null);
          this.siguiente += 1;
          return Promise.resolve(this.siguiente - 1);
        },
      },
      emisiones: {
        encolar: (ventaId) => {
          this.encoladas.push(ventaId);
          return Promise.resolve();
        },
        completar: () => Promise.resolve(),
      },
    };
  }
}

/** Catálogo con una gaseosa gravada y un arroz excluido; el comprador existe salvo que se diga lo contrario. */
export class CatalogoEnMemoria implements CatalogoDeVenta {
  articulos: ArticuloDelCatalogo[] = [gaseosa(), arroz()];
  compradorExiste = true;
  leer(_c: unknown, ids: readonly string[], compradorId: string | null) {
    const comprador = compradorId === null || this.compradorExiste ? adquirenteDePrueba() : null;
    return Promise.resolve({ articulos: this.articulos.filter((a) => ids.includes(a.productoId)), comprador });
  }
}
