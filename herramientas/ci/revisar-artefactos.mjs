// Revisa que todo paso que usa actions/upload-artifact en .github/workflows lleve `retention-days: 2`
// (HU-01.03 y Docs/forma-de-trabajo/flujo-de-ramas.md, sección 3). Sin dependencias: lee el YAML como texto.
// Uso: node herramientas/ci/revisar-artefactos.mjs [carpeta]   (sale con código 1 si hay un paso que no cumple)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIAS = '2';

/** Devuelve los pasos con upload-artifact que no fijan retention-days: 2, como "archivo:línea". */
export function revisar(nombre, texto) {
  const lineas = texto.split(/\r?\n/);
  const fallas = [];
  lineas.forEach((linea, i) => {
    if (!/^\s*(-\s+)?uses:\s*['"]?actions\/upload-artifact@/.test(linea)) return;
    // El paso empieza en la línea con "- " más cercana hacia arriba (o en esta misma).
    let inicio = i;
    while (inicio > 0 && !/^\s*-\s/.test(lineas[inicio])) inicio--;
    const sangria = lineas[inicio].search(/-/);
    let fin = inicio + 1;
    while (fin < lineas.length) {
      const l = lineas[fin];
      if (l.trim() !== '' && !l.trim().startsWith('#') && l.search(/\S/) <= sangria) break;
      fin++;
    }
    const paso = lineas.slice(inicio, fin).join('\n');
    const dias = paso.match(/^\s*retention-days:\s*['"]?([^'"\s#]+)/m);
    if (!dias || dias[1] !== DIAS) fallas.push(`${nombre}:${i + 1}`);
  });
  return fallas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const carpeta = process.argv[2] ?? '.github/workflows';
  const fallas = readdirSync(carpeta)
    .filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => revisar(join(carpeta, f), readFileSync(join(carpeta, f), 'utf8')));
  if (fallas.length) {
    for (const f of fallas) {
      console.error(`error artefactos-dos-dias: ${f} usa actions/upload-artifact sin "retention-days: ${DIAS}".`);
    }
    console.error('Los artefactos de Actions duran 2 días; lo que se conserva son las versiones (Docs/forma-de-trabajo/flujo-de-ramas.md).');
    process.exit(1);
  }
  console.log(`Todo actions/upload-artifact de ${carpeta} usa retention-days: ${DIAS}.`);
}
