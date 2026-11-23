import { DecimalExacto, ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Tarifas de IVA vigentes en Colombia (Estatuto Tributario, arts. 468, 468-1 y 477). */
export const TARIFAS_IVA = ['0', '5', '19'] as const;
export type TarifaIva = (typeof TARIFAS_IVA)[number];

export function tarifaIva(valor: string): TarifaIva {
  const tarifa = TARIFAS_IVA.find((t) => t === valor);
  if (!tarifa) throw new ErrorDominio('factura.tarifa-iva-invalida', `Tarifa de IVA no vigente: ${valor}`);
  return tarifa;
}

export function porcentajeDe(tarifa: TarifaIva): DecimalExacto {
  return DecimalExacto.desde(tarifa);
}
