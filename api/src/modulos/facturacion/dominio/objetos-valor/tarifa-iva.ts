import { ErrorDominio, esTarifaIva, type TarifaIva } from '../../../../compartido/dominio/index.js';

// Las tarifas viven en el dominio compartido desde HU-05.02 (las usa también el catálogo de productos).
export { porcentajeDe, TARIFAS_IVA, type TarifaIva } from '../../../../compartido/dominio/index.js';

export function tarifaIva(valor: string): TarifaIva {
  if (!esTarifaIva(valor)) throw new ErrorDominio('factura.tarifa-iva-invalida', `Tarifa de IVA no vigente: ${valor}`);
  return valor;
}
