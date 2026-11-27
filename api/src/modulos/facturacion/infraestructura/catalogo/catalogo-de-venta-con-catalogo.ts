import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { type Cliente, CONSUMIDOR_FINAL, type ObtenerParaVender, type Producto } from '../../../catalogo/index.js';
import type { CatalogoDeVenta, LoQueSeVende } from '../../aplicacion/puertos/catalogo-de-venta.js';
import { type ArticuloDelCatalogo, participante, type Participante } from '../../dominio/index.js';

/**
 * Adaptador al módulo de catálogo por su API pública (ObtenerParaVender): traduce productos y compradores a lo que
 * la factura necesita. Sin comprador, el adquirente es el consumidor final de la DIAN.
 */
export class CatalogoDeVentaConCatalogo implements CatalogoDeVenta {
  constructor(private readonly obtener: Pick<ObtenerParaVender, 'ejecutar'>) {}

  async leer(contexto: ContextoDeMiembro, productoIds: readonly string[], compradorId: string | null): Promise<LoQueSeVende> {
    const { productos, comprador } = await this.obtener.ejecutar(contexto, productoIds, compradorId);
    return {
      articulos: productos.map(articuloDe),
      comprador: compradorId === null ? consumidorFinal() : comprador && adquirenteDe(comprador),
    };
  }
}

function articuloDe(producto: Producto): ArticuloDelCatalogo {
  const { id, nombre, codigo, unidad, precio, iva } = producto.datos;
  return { productoId: id, nombre, codigo, unidad, precio, iva };
}

function adquirenteDe(cliente: Cliente): Participante {
  const d = cliente.datos;
  return participante({
    identificacion: d.identificacion,
    razonSocial: d.nombre,
    tipoDePersona: d.tipoDePersona,
    responsabilidadesFiscales: d.responsabilidadesFiscales,
    responsableDeIva: d.responsableDeIva,
    direccion: d.direccion,
    correo: d.correo,
  });
}

function consumidorFinal(): Participante {
  return participante({
    identificacion: CONSUMIDOR_FINAL.identificacion,
    razonSocial: CONSUMIDOR_FINAL.nombre,
    tipoDePersona: CONSUMIDOR_FINAL.tipoDePersona,
    responsabilidadesFiscales: CONSUMIDOR_FINAL.responsabilidadesFiscales,
    responsableDeIva: CONSUMIDOR_FINAL.responsableDeIva,
    direccion: CONSUMIDOR_FINAL.direccion,
    correo: CONSUMIDOR_FINAL.correo,
  });
}
