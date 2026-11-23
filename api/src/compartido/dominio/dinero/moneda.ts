// Monedas que CONTA admite. Los decimales son los de ISO 4217 y los del XML de la DIAN (2 para COP).
// Una moneda nueva se agrega aquí con su prueba.
const DECIMALES = { COP: 2, USD: 2, EUR: 2 } as const;

export type CodigoMoneda = keyof typeof DECIMALES;

export const MONEDAS: readonly CodigoMoneda[] = Object.keys(DECIMALES) as CodigoMoneda[];

export function decimalesDe(moneda: CodigoMoneda): number {
  const decimales = DECIMALES[moneda] as number | undefined;
  if (decimales === undefined) throw new RangeError(`Moneda no admitida: ${String(moneda)}`);
  return decimales;
}
