import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import { armarComprobante } from '../comprobante/armar-comprobante.js';
import type { RenderizadorDeComprobante } from '../puertos/renderizador-de-comprobante.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';

export interface ArchivoDelComprobante {
  readonly nombre: string;
  readonly pdf: Uint8Array;
}

/**
 * HU-06.08: el PDF de la factura de una venta aceptada, para compartirlo por WhatsApp. Pide Permiso.Vender y corre
 * en la transacción de la empresa (RLS): no hay enlace público, solo esta descarga con sesión. El PDF se dibuja
 * fuera de la transacción y sale siempre igual para la misma venta.
 */
export class ObtenerComprobante {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>,
    private readonly renderizador: RenderizadorDeComprobante,
  ) {}

  async ejecutar(contexto: ContextoDeMiembro, ventaId: string): Promise<ArchivoDelComprobante> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    const { comprobante } = await this.unidadDeTrabajo.ejecutar(contexto, (repositorios) => armarComprobante(repositorios, ventaId));
    return { nombre: comprobante.nombreDeArchivo, pdf: await this.renderizador.pdf(comprobante) };
  }
}
