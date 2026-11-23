// Convierte tokens.json en variables CSS para web/sitio y web/consola.
// El modo oscuro sigue al sistema, salvo que la página fije data-tema="claro" u "oscuro".
import { CABECERA, enGuiones } from './nombres.mjs';

export function generarCss(tokens) {
  const colores = (modo) => variables('color', tokens.color[modo]);
  const fijos = [
    ...variables('espacio', enPx(tokens.espacio)),
    ...variables('radio', enPx(tokens.radio)),
    ...variables('tamano', enPx(tokens.tipografia.tamanos)),
    ...variables('duracion', enMs(tokens.movimiento.duraciones)),
    `--conta-curva: ${tokens.movimiento.curva};`,
    ...variables('altura', enPx(tokens.alturas)),
    `--conta-fuente: '${tokens.tipografia.familias.web}', ${tokens.tipografia.respaldo};`,
    `--conta-fuente-cifras: tabular-nums;`,
  ];
  return `/* ${CABECERA} */
:root {
  color-scheme: light dark;
${sangrar([...fijos, ...colores('claro')])}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-tema='claro']) {
${sangrar(colores('oscuro'), 4)}
  }
}

:root[data-tema='oscuro'] {
  color-scheme: dark;
${sangrar(colores('oscuro'))}
}

:root[data-tema='claro'] {
  color-scheme: light;
}
`;
}

const variables = (grupo, valores) =>
  Object.entries(valores).map(([nombre, valor]) => `--conta-${grupo}-${enGuiones(nombre)}: ${valor};`);
const enPx = (valores) => mapear(valores, (v) => `${v}px`);
const enMs = (valores) => mapear(valores, (v) => `${v}ms`);
const mapear = (valores, f) => Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, f(v)]));
const sangrar = (lineas, n = 2) => lineas.map((l) => ' '.repeat(n) + l).join('\n');
