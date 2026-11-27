import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../src/compartido/aplicacion/index.js';
import type { CatalogoDeVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/catalogo-de-venta.js';
import type { IntentoDeCorreo } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorio-de-correos.js';
import type { FacturaDeLaVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorio-de-ventas.js';
import type { RepositoriosDeVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-venta.js';
import { type ArticuloDelCatalogo, CorreoDeFactura, type Participante, ResolucionDeNumeracion, type Venta } from '../../../../src/modulos/facturacion/dominio/index.js';
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
  /** HU-06.08: la factura enviada de cada venta, por id de venta. */
  readonly facturas = new Map<string, FacturaDeLaVenta>();
  readonly correos = new Map<string, CorreoDeFactura>();
  readonly intentosDeCorreo: IntentoDeCorreo[] = [];

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
        facturaDe: (id) => Promise.resolve(this.facturas.get(id) ?? null),
        deEnvio: (envioId) => {
          const venta = this.guardadas.get(envioId.replace(/^envio-/, ''));
          return Promise.resolve(venta ? { venta, resolucionId: 'r' } : null);
        },
        recientes: (limite) =>
          Promise.resolve(
            [...this.guardadas.values()].slice(-limite).reverse().map((v) => ({
              id: v.id,
              numero: v.datos.numero.aTexto(),
              emitidaEn: v.datos.emitidaEn,
              comprador: v.datos.comprador.razonSocial,
              total: v.total.aTexto(),
              estadoDelEnvio: this.facturas.get(v.id)?.estado ?? null,
            })),
          ),
      },
      correos: {
        buscar: (id) => {
          const c = this.correos.get(id);
          return Promise.resolve(c ? CorreoDeFactura.reconstituir(c.instantanea()) : null);
        },
        solicitar: (correo) => {
          if (!this.correos.has(correo.ventaId)) this.correos.set(correo.ventaId, correo);
          return Promise.resolve();
        },
        actualizar: (correo, leido) => {
          const actual = this.correos.get(correo.ventaId)?.instantanea();
          if (actual?.intentos !== leido.intentos || actual.ultimaFalla !== leido.ultimaFalla) return Promise.resolve(false);
          this.correos.set(correo.ventaId, CorreoDeFactura.reconstituir(correo.instantanea()));
          return Promise.resolve(true);
        },
        registrarIntento: (intento) => Promise.resolve(void this.intentosDeCorreo.push(intento)),
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
        registrarFalla: () => Promise.resolve(1),
        reprogramar: () => Promise.resolve(),
        fallasDe: () => Promise.resolve(null),
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
