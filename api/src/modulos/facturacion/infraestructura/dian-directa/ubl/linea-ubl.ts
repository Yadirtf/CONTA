import type { LineaDeFactura } from '../../../dominio/index.js';
import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';
import { PESOS } from './constantes-dian.js';
import { subtotalDeIva } from './impuestos-ubl.js';
import { monto } from './montos.js';

/** cac:InvoiceLine; las líneas se numeran desde 1 en el orden de la factura. */
export function lineaUbl(l: LineaDeFactura, indice: number): NodoXml {
  return grupo('cac:InvoiceLine', [
    el('cbc:ID', String(indice + 1)),
    el('cbc:InvoicedQuantity', l.cantidad.aTexto(), { unitCode: l.unidad }),
    el('cbc:LineExtensionAmount', monto(l.valor), PESOS),
    grupo('cac:TaxTotal', [el('cbc:TaxAmount', monto(l.iva), PESOS), subtotalDeIva(l.valor, l.iva, l.tarifaIva)]),
    grupo('cac:Item', [
      el('cbc:Description', l.descripcion),
      l.codigo !== null && grupo('cac:StandardItemIdentification', [el('cbc:ID', l.codigo, { schemeID: '999' })]),
    ]),
    grupo('cac:Price', [
      el('cbc:PriceAmount', l.precioUnitario.monto.aTexto(2), PESOS),
      el('cbc:BaseQuantity', '1', { unitCode: l.unidad }),
    ]),
  ]);
}
