import { type Dinero, ErrorDominio } from '../../../../compartido/dominio/index.js';
import { codigoUnicoDe, NOMBRE_CORTO_DEL_DOCUMENTO, NOMBRE_DEL_DOCUMENTO } from '../documentos/clase-de-documento.js';
import type { ResolucionDeNumeracion } from '../entidades/resolucion-de-numeracion.js';
import { MomentoDeEmision } from '../objetos-valor/momento-de-emision.js';
import type { Participante } from '../objetos-valor/participante.js';
import type { MedioDePago } from '../ventas/medio-de-pago.js';
import type { Venta } from '../ventas/venta.js';
import { cantidad, identificacionLegible, pesos } from './formato-colombiano.js';

/** Una línea como se imprime: todo ya en texto, nada se recalcula al dibujar. */
export interface LineaDelComprobante {
  readonly descripcion: string;
  readonly cantidad: string;
  readonly precioConIva: string;
  /** «IVA 19 %», «Exento» o «Excluido». */
  readonly iva: string;
  readonly total: string;
}

export interface ParteDelComprobante {
  readonly nombre: string;
  readonly identificacion: string;
  /** Dirección, responsabilidades y correo: las líneas que van debajo del nombre. */
  readonly detalles: readonly string[];
}

/**
 * Representación gráfica de la factura de una venta (HU-06.08): lo que pide la DIAN que vea el comprador, ya en
 * texto. La arma el dominio para que el PDF (infraestructura) solo dibuje y nunca decida un valor fiscal.
 */
export interface ComprobanteDeVenta {
  /** El nombre del documento que exige la norma (factura o tiquete POS, HU-06.02). */
  readonly titulo: string;
  /** El mismo, corto, para el asunto del correo: «Factura electrónica» o «Tiquete POS electrónico». */
  readonly nombreCorto: string;
  /** «CUFE» en la factura, «CUDE» en el tiquete POS. */
  readonly etiquetaDelCodigo: 'CUFE' | 'CUDE';
  readonly numero: string;
  /** «2026-11-27 10:04:05 (hora de Colombia)». */
  readonly emitida: string;
  readonly emisor: ParteDelComprobante;
  readonly adquirente: ParteDelComprobante;
  readonly lineas: readonly LineaDelComprobante[];
  /** Pares «etiqueta, valor»: subtotal sin IVA, IVA de cada tarifa y total. */
  readonly totales: readonly (readonly [string, string])[];
  readonly pago: string;
  readonly resolucion: string;
  readonly cufe: string;
  /** El texto del QR, tal como quedó en el XML firmado (anexo 11.7.1). */
  readonly codigoQr: string;
  readonly nombreDeArchivo: string;
}

export interface DatosDelComprobante {
  readonly venta: Venta;
  readonly emisor: Participante;
  readonly resolucion: ResolucionDeNumeracion;
  readonly cufe: string;
  readonly codigoQr: string;
}

const MEDIOS: Readonly<Record<MedioDePago, string>> = {
  efectivo: 'Efectivo',
  'tarjeta-debito': 'Tarjeta débito',
  'tarjeta-credito': 'Tarjeta crédito',
  transferencia: 'Transferencia',
};

export function comprobanteDeVenta({ venta, emisor, resolucion, cufe, codigoQr }: DatosDelComprobante): ComprobanteDeVenta {
  if (!/^[0-9a-f]{96}$/.test(cufe)) throw new ErrorDominio('comprobante.cufe-invalido', 'El código único no es válido');
  if (!codigoQr.includes(cufe)) throw new ErrorDominio('comprobante.qr-invalido', 'El QR no corresponde al documento');
  if (resolucion.clase !== venta.clase) {
    throw new ErrorDominio('comprobante.resolucion-de-otra-clase', 'La resolución no es de la clase del documento');
  }
  const { datos } = venta;
  const numero = datos.numero.aTexto();
  const momento = MomentoDeEmision.desde(datos.emitidaEn);
  return {
    titulo: NOMBRE_DEL_DOCUMENTO[venta.clase],
    nombreCorto: NOMBRE_CORTO_DEL_DOCUMENTO[venta.clase],
    etiquetaDelCodigo: codigoUnicoDe(venta.clase) === 'cude' ? 'CUDE' : 'CUFE',
    numero,
    emitida: `${momento.fecha} ${momento.hora.slice(0, 8)} (hora de Colombia)`,
    emisor: parteDe(emisor, true),
    adquirente: parteDe(datos.comprador, false),
    lineas: datos.lineas.map(({ articulo, cantidad: unidades, desglose }) => ({
      descripcion: articulo.codigo ? `${articulo.nombre} (${articulo.codigo})` : articulo.nombre,
      cantidad: cantidad(unidades),
      precioConIva: pesos(articulo.precio),
      iva: articulo.iva.tipo === 'gravado' ? `IVA ${articulo.iva.tarifa} %` : articulo.iva.tipo === 'exento' ? 'Exento' : 'Excluido',
      total: pesos(desglose.total),
    })),
    totales: totalesDe(venta),
    pago: `Contado · ${MEDIOS[datos.medioDePago]}`,
    resolucion:
      `Resolución DIAN ${resolucion.numero} del ${resolucion.vigenteDesde} al ${resolucion.vigenteHasta}. ` +
      `Autoriza del ${resolucion.prefijo}${resolucion.desde} al ${resolucion.prefijo}${resolucion.hasta}.`,
    cufe,
    codigoQr,
    nombreDeArchivo: `${venta.clase === 'pos' ? 'tiquete-pos' : 'factura'}-${numero}.pdf`,
  };
}

function parteDe(p: Participante, esEmisor: boolean): ParteDelComprobante {
  const detalles: string[] = [];
  if (p.direccion) detalles.push(`${p.direccion.linea}, ${p.direccion.ciudad}, ${p.direccion.departamento}`);
  if (esEmisor) {
    detalles.push(p.responsableDeIva ? 'Responsable de IVA' : 'No responsable de IVA');
    detalles.push(`Responsabilidades: ${p.responsabilidadesFiscales.join(', ')}`);
  }
  if (p.correo) detalles.push(p.correo);
  return { nombre: p.razonSocial, identificacion: identificacionLegible(p.identificacion), detalles };
}

/** Base y IVA por tarifa, sumados de las líneas como en la factura: exento va con IVA 0 % y excluido sin IVA. */
function totalesDe(venta: Venta): (readonly [string, string])[] {
  const porTarifa = new Map<string, { base: Dinero; iva: Dinero }>();
  for (const { articulo, desglose } of venta.datos.lineas) {
    if (articulo.iva.tarifa === null) continue;
    const previo = porTarifa.get(articulo.iva.tarifa);
    porTarifa.set(articulo.iva.tarifa, {
      base: previo ? previo.base.sumar(desglose.base) : desglose.base,
      iva: previo ? previo.iva.sumar(desglose.iva) : desglose.iva,
    });
  }
  const filas: (readonly [string, string])[] = [['Subtotal sin IVA', pesos(venta.base)]];
  for (const tarifa of ['19', '5', '0']) {
    const t = porTarifa.get(tarifa);
    if (t) filas.push([`IVA ${tarifa} % (base ${pesos(t.base)})`, pesos(t.iva)]);
  }
  filas.push(['Total', pesos(venta.total)]);
  return filas;
}
