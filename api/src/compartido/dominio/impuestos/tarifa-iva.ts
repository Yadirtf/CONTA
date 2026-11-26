import { DecimalExacto } from '../dinero/index.js';

/**
 * Tarifas de IVA vigentes en Colombia (Estatuto Tributario, arts. 468, 468-1 y 477). La de 0 % es la de los
 * bienes exentos. La usan el catálogo (HU-05.02) y la factura (HU-02.01).
 */
export const TARIFAS_IVA = ['0', '5', '19'] as const;
export type TarifaIva = (typeof TARIFAS_IVA)[number];

export function esTarifaIva(valor: unknown): valor is TarifaIva {
  return typeof valor === 'string' && (TARIFAS_IVA as readonly string[]).includes(valor);
}

export function porcentajeDe(tarifa: TarifaIva): DecimalExacto {
  return DecimalExacto.desde(tarifa);
}
