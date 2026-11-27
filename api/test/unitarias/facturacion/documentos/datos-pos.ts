import { Dinero, tratamientoDeIva } from '../../../../src/compartido/dominio/index.js';
import { CONSUMIDOR_FINAL } from '../../../../src/modulos/catalogo/index.js';
import {
  type ArticuloDelCatalogo,
  lineaDeVenta,
  NumeroDeFactura,
  participante,
  type Participante,
  ResolucionDeNumeracion,
  Venta,
} from '../../../../src/modulos/facturacion/dominio/index.js';

// HU-06.02: una venta de mostrador con tiquete POS y su resolución.

export const resolucionPos = () =>
  ResolucionDeNumeracion.crear({
    numero: '18760000002',
    prefijo: 'EPOS',
    desde: 1,
    hasta: 1000,
    vigenteDesde: '2026-01-01',
    vigenteHasta: '2027-12-31',
    clase: 'pos',
  });

export const consumidorFinal = (): Participante =>
  participante({
    identificacion: CONSUMIDOR_FINAL.identificacion,
    razonSocial: CONSUMIDOR_FINAL.nombre,
    tipoDePersona: CONSUMIDOR_FINAL.tipoDePersona,
    responsabilidadesFiscales: CONSUMIDOR_FINAL.responsabilidadesFiscales,
    responsableDeIva: CONSUMIDOR_FINAL.responsableDeIva,
    direccion: CONSUMIDOR_FINAL.direccion,
    correo: CONSUMIDOR_FINAL.correo,
  });

export const gaseosa: ArticuloDelCatalogo = {
  productoId: '11111111-1111-4111-8111-111111111111',
  nombre: 'Gaseosa 400 ml',
  codigo: null,
  unidad: '94',
  precio: Dinero.de('2500'),
  iva: tratamientoDeIva('gravado', '19'),
};

/** Una venta con tiquete POS: 3 gaseosas por $7.500 con IVA. */
export function ventaPos(cantidad = '3'): Venta {
  return Venta.registrar({
    id: 'dddddddd-0000-4000-8000-000000000001',
    huella: 'e'.repeat(64),
    numero: NumeroDeFactura.de('EPOS', 7),
    clase: 'pos',
    emitidaEn: new Date('2026-11-27T15:04:05Z'),
    comprador: consumidorFinal(),
    lineas: [lineaDeVenta(gaseosa, cantidad)],
    medioDePago: 'efectivo',
    creadaPor: 'bbbbbbbb-0000-4000-8000-000000000001',
  });
}
