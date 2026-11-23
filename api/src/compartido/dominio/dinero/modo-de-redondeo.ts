// Modos de redondeo de CONTA (HU-01.04, ADR-0005).
// - mitad-al-par: el de la DIAN. Anexo técnico 1.9, sección 5.2.1: «round-half-to-even» (NTC 3711).
//   0-4 se mantiene, 6-9 sube, y un 5 exacto deja el dígito par: 2,5 → 2; 3,5 → 4; -2,5 → -2.
// - mitad-lejos-de-cero: el «de colegio»: 2,5 → 3; -2,5 → -3. Solo si una norma lo pide.
// - hacia-cero: trunca: 2,9 → 2; -2,9 → -2.
export type ModoDeRedondeo = 'mitad-al-par' | 'mitad-lejos-de-cero' | 'hacia-cero';

export const REDONDEO_DIAN: ModoDeRedondeo = 'mitad-al-par';

/** Divide dos enteros y redondea el cociente con el modo dado. El divisor no puede ser cero. */
export function dividirEnterosRedondeando(dividendo: bigint, divisor: bigint, modo: ModoDeRedondeo): bigint {
  if (divisor === 0n) throw new RangeError('División por cero');
  const cociente = dividendo / divisor; // BigInt trunca hacia cero
  const resto = dividendo % divisor;
  if (resto === 0n || modo === 'hacia-cero') return cociente;

  const doble = 2n * abs(resto);
  const mitad = abs(divisor);
  const alejar = (dividendo < 0n) !== (divisor < 0n) ? -1n : 1n;
  if (doble > mitad) return cociente + alejar;
  if (doble < mitad) return cociente;
  // Exactamente en la mitad.
  if (modo === 'mitad-lejos-de-cero') return cociente + alejar;
  return cociente % 2n === 0n ? cociente : cociente + alejar;
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
