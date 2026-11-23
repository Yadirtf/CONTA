// Revisa que tokens.json sea coherente: los dos modos tienen los mismos colores
// y cada par de contraste declarado cumple su mínimo (WCAG AA) en claro y en oscuro.
import { razonDeContraste } from './contraste.mjs';

/** Devuelve la lista de fallas, en palabras. Vacía si todo cumple. */
export function revisarTokens(tokens) {
  const fallas = [];
  const { claro, oscuro } = tokens.color;
  const nombresClaro = Object.keys(claro).sort().join();
  const nombresOscuro = Object.keys(oscuro).sort().join();
  if (nombresClaro !== nombresOscuro) fallas.push('Los modos claro y oscuro no tienen los mismos colores');

  for (const [modo, paleta] of Object.entries(tokens.color)) {
    for (const { primero, fondo, minimo } of tokens.contrastes) {
      if (!paleta[primero] || !paleta[fondo]) {
        fallas.push(`${modo}: el par ${primero}/${fondo} nombra un color que no existe`);
        continue;
      }
      const razon = razonDeContraste(paleta[primero], paleta[fondo]);
      if (razon < minimo) {
        fallas.push(`${modo}: ${primero} sobre ${fondo} tiene ${razon.toFixed(2)}:1 y pide ${minimo}:1`);
      }
    }
  }
  return fallas;
}
