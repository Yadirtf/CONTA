// Falla si una pantalla o componente escribe a mano un color, espacio, radio o tamaño de letra (ADR-0009).
// Uso (desde la raíz del repositorio): node herramientas/diseno/revisar-estilos.mjs
// Solo el módulo de tema puede tener valores: los archivos generados desde contratos/diseno/tokens.json y
// el tema de la app, que los traduce a Flutter. Lo demás usa los tokens.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lenguajeDe, revisarTexto } from './estilos/revisar-texto.mjs';

export const RAICES = ['app/lib', 'web/sitio/src', 'web/consola/src'];
/** Módulo de tema: único lugar con valores de diseño. */
export const MODULO_DE_TEMA = ['app/lib/nucleo/tema/', 'web/sitio/src/compartido/estilos/', 'web/consola/src/compartido/estilos/'];
const PRUEBAS = /\.(?:test|spec)\.[jt]sx?$|_test\.dart$/;

/** ¿Se revisa esta ruta? Fuera quedan el módulo de tema y las pruebas. */
export function seRevisa(ruta) {
  return lenguajeDe(ruta) !== null && !PRUEBAS.test(ruta) && !MODULO_DE_TEMA.some((m) => ruta.startsWith(m));
}

function archivos(directorio) {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(directorio, e.name);
    return e.isDirectory() ? archivos(ruta) : [ruta.replaceAll('\\', '/')];
  });
}

function principal() {
  const revisados = RAICES.flatMap(archivos).filter(seRevisa);
  const hallazgos = revisados.flatMap((ruta) => revisarTexto(ruta, readFileSync(ruta, 'utf8')));
  for (const h of hallazgos) console.error(`✗ ${h.ruta}:${h.linea} [${h.regla}] ${h.texto}\n    usa ${h.usa}`);
  if (hallazgos.length) {
    console.error(`\n${hallazgos.length} estilos sueltos. Cambia el valor en contratos/diseno/tokens.json, no en la pantalla.`);
    process.exit(1);
  }
  console.log(`Sin estilos sueltos (${revisados.length} archivos revisados).`);
}

if (import.meta.url === `file://${process.argv[1]}`) principal();
