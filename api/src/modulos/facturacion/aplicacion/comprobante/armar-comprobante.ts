import { comprobanteDeVenta, type ComprobanteDeVenta, type Venta } from '../../dominio/index.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';
import { facturacionNoHabilitada, ventaNoEncontrada } from '../ventas/errores-de-venta.js';
import { comprobanteEnCamino, comprobanteRechazado } from './errores-de-comprobante.js';

export interface ComprobanteArmado {
  readonly venta: Venta;
  readonly comprobante: ComprobanteDeVenta;
  readonly xmlFirmado: string;
  /** Correo del negocio, para que el comprador le responda a él. */
  readonly correoDelEmisor: string | null;
}

/**
 * Lee, dentro de la transacción de la empresa, lo que lleva el comprobante de una venta aceptada por la DIAN: la
 * venta, la resolución y el emisor, el CUFE y el QR tal como quedaron en el XML firmado. Nada se recalcula: si
 * después cambian los datos fiscales del negocio, el comprobante sigue diciendo lo que aceptó la DIAN.
 */
export async function armarComprobante(
  { ventas, numeracion }: Pick<RepositoriosDeVenta, 'ventas' | 'numeracion'>,
  ventaId: string,
): Promise<ComprobanteArmado> {
  const guardada = await ventas.conId(ventaId);
  if (!guardada) throw ventaNoEncontrada();
  const factura = await ventas.facturaDe(ventaId);
  if (factura?.estado === 'rechazado') throw comprobanteRechazado();
  if (factura?.estado !== 'aceptado') throw comprobanteEnCamino();
  const resolucion = await numeracion.resolucion(guardada.resolucionId);
  if (!resolucion) throw facturacionNoHabilitada();
  const { emisor } = factura;
  const comprobante = comprobanteDeVenta({
    venta: guardada.venta,
    emisor,
    resolucion,
    cufe: factura.cufe,
    codigoQr: factura.codigoQr,
  });
  return { venta: guardada.venta, comprobante, xmlFirmado: factura.xmlFirmado, correoDelEmisor: emisor.correo };
}
