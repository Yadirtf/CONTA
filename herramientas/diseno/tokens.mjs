// Genera los tokens de diseño para app/ y web/ desde contratos/diseno/tokens.json (ADR-0009).
// Uso (desde la raíz del repositorio):
//   node herramientas/diseno/tokens.mjs            escribe los archivos generados
//   node herramientas/diseno/tokens.mjs --revisar  falla si un contraste no cumple o un archivo está desactualizado
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { generarCss } from './generar-css.mjs';
import { generarDart } from './generar-dart.mjs';
import { revisarTokens } from './revisar-tokens.mjs';

export const FUENTE = 'contratos/diseno/tokens.json';
export const DESTINOS = [
  { ruta: 'app/lib/nucleo/tema/tokens_conta.g.dart', generar: generarDart },
  { ruta: 'web/sitio/src/compartido/estilos/tokens.css', generar: generarCss },
  { ruta: 'web/consola/src/compartido/estilos/tokens.css', generar: generarCss },
];

function principal(revisar) {
  const tokens = JSON.parse(readFileSync(FUENTE, 'utf8'));
  const fallas = revisarTokens(tokens);
  for (const { ruta, generar } of DESTINOS) {
    const contenido = generar(tokens);
    if (!revisar) writeFileSync(ruta, contenido);
    else if (!existsSync(ruta) || readFileSync(ruta, 'utf8') !== contenido) {
      fallas.push(`${ruta} está desactualizado: corre node herramientas/diseno/tokens.mjs`);
    }
  }
  fallas.forEach((f) => console.error(`✗ ${f}`));
  if (fallas.length) process.exit(1);
  console.log(revisar ? 'Tokens al día y contrastes AA.' : 'Tokens generados.');
}

if (import.meta.url === `file://${process.argv[1]}`) principal(process.argv.includes('--revisar'));
