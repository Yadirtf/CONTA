import { ErrorDominio, textoLimpio } from '../../../../compartido/dominio/index.js';

/**
 * La caja donde se hizo la venta (extensión PuntoVenta del tiquete POS). En CONTA la caja es el celular con la app;
 * cada dato sale de lo guardado en la venta, así que el tiquete sale igual cada vez que se arma.
 */
export interface PuntoDeVenta {
  /** PlacaCaja: identificador de inventario de la caja. */
  readonly placa: string;
  /** UbicaciónCaja: dónde está (la dirección del negocio). */
  readonly ubicacion: string;
  /** Cajero: quién vendió. */
  readonly cajero: string;
  /** TipoCaja. */
  readonly tipo: string;
  /** CódigoVenta: el número del tiquete. */
  readonly codigoDeVenta: string;
}

const LARGO_MAXIMO = 200;

const limpio = (texto: string) => textoLimpio(texto).slice(0, LARGO_MAXIMO);

export function puntoDeVenta(datos: PuntoDeVenta): PuntoDeVenta {
  const caja: PuntoDeVenta = {
    placa: limpio(datos.placa),
    ubicacion: limpio(datos.ubicacion),
    cajero: limpio(datos.cajero),
    tipo: limpio(datos.tipo),
    codigoDeVenta: limpio(datos.codigoDeVenta),
  };
  if ([caja.placa, caja.ubicacion, caja.cajero, caja.tipo, caja.codigoDeVenta].some((v) => v.length === 0)) {
    throw new ErrorDominio('pos.punto-de-venta-incompleto', 'El tiquete POS necesita los datos de la caja');
  }
  return caja;
}
