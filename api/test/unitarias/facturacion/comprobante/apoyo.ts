import { Dinero, tratamientoDeIva } from '../../../../src/compartido/dominio/index.js';
import type { FacturaDeLaVenta } from '../../../../src/modulos/facturacion/aplicacion/puertos/repositorio-de-ventas.js';
import { lineaDeVenta, NumeroDeFactura, participante, ResolucionDeNumeracion, Venta } from '../../../../src/modulos/facturacion/dominio/index.js';
import { Identificacion } from '../../../../src/modulos/facturacion/dominio/index.js';
import { adquirenteDePrueba, emisorDePrueba } from '../datos-de-prueba.js';
import { arroz, gaseosa } from '../ventas/apoyo.js';

// Datos de prueba del comprobante (HU-06.08): una venta con gravado, exento y excluido, y su factura aceptada.

export const CUFE = 'b'.repeat(96);
export const QR = `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${CUFE}`;
export const VENTA_ID = '33333333-3333-4333-8333-333333333333';

export const huevos = () => ({
  productoId: '44444444-4444-4444-8444-444444444444',
  nombre: 'Huevos x 30',
  codigo: 'H-30',
  unidad: '94',
  precio: Dinero.de('18000'),
  iva: tratamientoDeIva('exento', '0'),
});

export const compradorConCorreo = () =>
  participante({
    identificacion: Identificacion.de('13', '1020304050'),
    razonSocial: 'Ana Pérez',
    tipoDePersona: 'natural',
    responsabilidadesFiscales: ['R-99-PN'],
    responsableDeIva: false,
    direccion: null,
    correo: 'ana@ejemplo.test',
  });

export function ventaDePrueba(id = VENTA_ID, comprador = adquirenteDePrueba()): Venta {
  return Venta.registrar({
    id,
    huella: 'f'.repeat(64),
    numero: NumeroDeFactura.de('SETP', 990000001),
    clase: 'factura',
    emitidaEn: new Date('2026-11-27T15:04:05Z'),
    comprador,
    lineas: [lineaDeVenta(gaseosa(), '3'), lineaDeVenta(huevos(), '1'), lineaDeVenta(arroz(), '1.5')],
    medioDePago: 'transferencia',
    creadaPor: '55555555-5555-4555-8555-555555555555',
  });
}

export const resolucionDePrueba = () =>
  ResolucionDeNumeracion.crear({
    numero: '18760000001',
    prefijo: 'SETP',
    desde: 990000000,
    hasta: 995000000,
    vigenteDesde: '2019-01-19',
    vigenteHasta: '2030-01-19',
  });

export const facturaAceptada = (estado: FacturaDeLaVenta['estado'] = 'aceptado'): FacturaDeLaVenta => ({
  estado,
  cufe: CUFE,
  codigoQr: QR,
  emisor: emisorDePrueba(),
  xmlFirmado: `<Invoice><sts:QRCode>${QR}</sts:QRCode></Invoice>`,
});
