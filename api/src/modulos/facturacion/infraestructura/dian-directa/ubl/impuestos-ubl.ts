import { DecimalExacto, type Dinero } from '../../../../../compartido/dominio/index.js';
import type { Factura } from '../../../dominio/index.js';
import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';
import { PESOS } from './constantes-dian.js';
import { monto } from './montos.js';

/** cac:TaxTotal del IVA: el valor total y un subtotal por tarifa. */
export function totalDeIva(total: Dinero, subtotales: Factura['subtotalesIva']): NodoXml {
  return grupo('cac:TaxTotal', [
    el('cbc:TaxAmount', monto(total), PESOS),
    ...subtotales.map((s) => subtotalDeIva(s.base, s.valor, s.tarifa)),
  ]);
}

/** cac:TaxSubtotal de una tarifa de IVA (también se usa dentro de cada línea). */
export function subtotalDeIva(base: Dinero, valor: Dinero, tarifa: string): NodoXml {
  return grupo('cac:TaxSubtotal', [
    el('cbc:TaxableAmount', monto(base), PESOS),
    el('cbc:TaxAmount', monto(valor), PESOS),
    grupo('cac:TaxCategory', [
      el('cbc:Percent', DecimalExacto.desde(tarifa).aTexto(2)),
      grupo('cac:TaxScheme', [el('cbc:ID', '01'), el('cbc:Name', 'IVA')]),
    ]),
  ]);
}
