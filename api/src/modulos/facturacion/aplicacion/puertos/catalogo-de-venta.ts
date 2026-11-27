import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import type { ArticuloDelCatalogo, Participante } from '../../dominio/index.js';

/** Lo que una venta necesita del catálogo de la empresa (HU-05.01 y HU-05.02), ya traducido a facturación. */
export interface LoQueSeVende {
  /** Solo los productos que existen en la empresa; los demás no vienen. */
  readonly articulos: readonly ArticuloDelCatalogo[];
  /** El adquirente de la factura: consumidor final si no se pidió comprador; null si el pedido no es de la empresa. */
  readonly comprador: Participante | null;
}

/** Puerta al catálogo. La implementa la infraestructura con la API pública del módulo de catálogo. */
export interface CatalogoDeVenta {
  leer(contexto: ContextoDeMiembro, productoIds: readonly string[], compradorId: string | null): Promise<LoQueSeVende>;
}

export const CATALOGO_DE_VENTA = Symbol('CatalogoDeVenta');
