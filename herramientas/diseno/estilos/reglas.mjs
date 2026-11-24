// Reglas contra estilos sueltos (ADR-0009): ningún color, espacio, radio ni tamaño de letra se escribe a mano
// fuera del módulo de tema. Todo sale de contratos/diseno/tokens.json a través de los archivos generados.
// Cada regla dice a qué lenguajes aplica, qué busca y qué usar en su lugar.

const NOMBRES_CSS = [
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey',
  'navy', 'teal', 'olive', 'maroon', 'silver', 'lime', 'aqua', 'fuchsia', 'cyan', 'magenta', 'indigo',
];
const PROPIEDADES_DE_COLOR = '(?:color|background(?:-color)?|border(?:-[a-z]+)?-color|border|outline(?:-color)?|fill|stroke|backgroundColor|borderColor|outlineColor)';
const PROPIEDADES_DE_MEDIDA_CSS = '(?:padding|margin|gap|row-gap|column-gap|font-size|border-radius|inset|top|right|bottom|left)(?:-[a-z]+)?';
const PROPIEDADES_DE_MEDIDA_TS = '(?:padding|margin|gap|rowGap|columnGap|fontSize|borderRadius|inset|top|right|bottom|left)(?:[A-Z][a-z]+)*';
/** Un número distinto de cero (0, 0.0 y 0px están permitidos: no son una medida de diseño). */
const NUMERO = '(?:[1-9]\\d*(?:\\.\\d+)?|0?\\.\\d*[1-9]\\d*)';

export const REGLAS = [
  {
    id: 'color-hex',
    lenguajes: ['css', 'ts'],
    patron: /(?:^|[\s:,('"`])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/,
    usa: 'var(--conta-color-*)',
  },
  {
    id: 'color-funcion',
    lenguajes: ['css', 'ts'],
    patron: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/,
    usa: 'var(--conta-color-*)',
  },
  {
    id: 'color-nombre',
    lenguajes: ['css', 'ts'],
    patron: new RegExp(`\\b${PROPIEDADES_DE_COLOR}\\s*:\\s*['"]?(?:${NOMBRES_CSS.join('|')})\\b`, 'i'),
    usa: 'var(--conta-color-*)',
  },
  {
    id: 'medida-css',
    lenguajes: ['css'],
    patron: new RegExp(`(?:^|[\\s;{])${PROPIEDADES_DE_MEDIDA_CSS}\\s*:[^;]*\\b${NUMERO}(?:px|rem|em)\\b`),
    usa: 'var(--conta-espacio-*), var(--conta-radio-*) o var(--conta-tamano-*)',
  },
  {
    id: 'medida-estilo-en-linea',
    lenguajes: ['ts'],
    patron: new RegExp(`\\b${PROPIEDADES_DE_MEDIDA_TS}\\s*:\\s*(?:${NUMERO}\\b|['"\`][^'"\`]*\\b${NUMERO}(?:px|rem|em)\\b)`),
    usa: 'var(--conta-espacio-*), var(--conta-radio-*) o var(--conta-tamano-*)',
  },
  {
    id: 'color-dart',
    lenguajes: ['dart'],
    patron: /\bColor\s*\(\s*0x|\bColor\.from(?:ARGB|RGBO)\s*\(|\b(?:Cupertino)?Colors\.(?!transparent\b)\w+/,
    usa: 'context.paleta (lib/nucleo/tema/) o el ColorScheme del tema',
  },
  {
    id: 'espacio-dart',
    lenguajes: ['dart'],
    patron: new RegExp(`\\bEdgeInsets(?:Directional)?\\.\\w+\\((?:[^)]*?[:,\\s])?${NUMERO}\\b|\\bSizedBox\\s*\\([^)]*\\b(?:height|width)\\s*:\\s*${NUMERO}\\b`),
    usa: 'EspacioConta, AlturaConta',
  },
  {
    id: 'forma-dart',
    lenguajes: ['dart'],
    patron: new RegExp(`Radius\\.circular\\s*\\(\\s*${NUMERO}\\b|\\bfontSize\\s*:\\s*${NUMERO}\\b`),
    usa: 'RadioConta, TextoConta',
  },
];

/** Comentario que permite una excepción en esa línea. Debe decir por qué: `estilo-permitido: <motivo>`. */
export const EXCEPCION = /estilo-permitido:\s*\S{3,}/;
