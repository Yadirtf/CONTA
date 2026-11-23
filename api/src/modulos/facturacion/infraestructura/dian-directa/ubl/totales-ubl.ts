import type { Factura } from '../../../dominio/index.js';
import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';
import { PESOS } from './constantes-dian.js';
import { monto } from './montos.js';

/** cac:PaymentMeans: contado (1) o crédito (2), con el medio de pago y el vencimiento si lo hay. */
export function formaDePagoUbl({ formaDePago }: Factura): NodoXml {
  return grupo('cac:PaymentMeans', [
    el('cbc:ID', formaDePago.metodo === 'contado' ? '1' : '2'),
    el('cbc:PaymentMeansCode', formaDePago.medio),
    formaDePago.vence !== null && el('cbc:PaymentDueDate', formaDePago.vence),
  ]);
}

/** cac:LegalMonetaryTotal. Sin descuentos ni cargos globales por ahora. */
export function totalesUbl(factura: Factura): NodoXml {
  return grupo('cac:LegalMonetaryTotal', [
    el('cbc:LineExtensionAmount', monto(factura.totalBruto), PESOS),
    el('cbc:TaxExclusiveAmount', monto(factura.totalBruto), PESOS),
    el('cbc:TaxInclusiveAmount', monto(factura.total), PESOS),
    el('cbc:AllowanceTotalAmount', '0.00', PESOS),
    el('cbc:ChargeTotalAmount', '0.00', PESOS),
    el('cbc:PayableAmount', monto(factura.total), PESOS),
  ]);
}
