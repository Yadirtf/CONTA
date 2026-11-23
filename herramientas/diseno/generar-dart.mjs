// Convierte tokens.json en constantes Dart para app/ (Flutter).
// Solo valores: el ThemeData se arma a mano en app/lib/nucleo/tema/tema_conta.dart.
import { CABECERA, enCamello } from './nombres.mjs';

export function generarDart(tokens) {
  const nombres = Object.keys(tokens.color.claro);
  const campos = nombres.map((n) => `  final Color ${enCamello(n)};`).join('\n');
  const parametros = nombres.map((n) => `    required this.${enCamello(n)},`).join('\n');
  const paleta = (modo) =>
    nombres.map((n) => `    ${enCamello(n)}: Color(${argb(tokens.color[modo][n])}),`).join('\n');

  return `// ${CABECERA}

import 'dart:ui' show Color;

/// Colores de un modo (claro u oscuro). Los nombres dicen el papel, no el tono.
final class PaletaConta {
  const PaletaConta({
${parametros}
  });

${campos}

  static const claro = PaletaConta(
${paleta('claro')}
  );

  static const oscuro = PaletaConta(
${paleta('oscuro')}
  );
}

${clase('EspacioConta', 'Escala de espaciado en dp (múltiplos de 4).', tokens.espacio)}

${clase('RadioConta', 'Radios de esquina en dp.', tokens.radio)}

${clase('AlturaConta', 'Alturas mínimas de toque en dp.', tokens.alturas)}

${clase('TextoConta', 'Tamaños de texto en sp.', tokens.tipografia.tamanos)}

/// Tipografía y movimiento.
abstract final class EstiloConta {
  static const familia = '${tokens.tipografia.familias.app}';
  static const pesoNormal = ${tokens.tipografia.pesos.normal};
  static const pesoMedio = ${tokens.tipografia.pesos.medio};
  static const pesoFuerte = ${tokens.tipografia.pesos.fuerte};
${Object.entries(tokens.movimiento.duraciones)
  .map(([k, v]) => `  static const duracion${mayuscula(enCamello(k))} = Duration(milliseconds: ${v});`)
  .join('\n')}
}
`;
}

function clase(nombre, doc, valores) {
  const lineas = Object.entries(valores)
    .map(([k, v]) => `  static const ${dartId(enCamello(k))} = ${decimal(v)};`)
    .join('\n');
  return `/// ${doc}\nabstract final class ${nombre} {\n${lineas}\n}`;
}

const argb = (hex) => `0xFF${hex.slice(1).toUpperCase()}`;
const decimal = (n) => (Number.isInteger(n) ? `${n}.0` : `${n}`);
const mayuscula = (s) => s[0].toUpperCase() + s.slice(1);
// Un identificador Dart no empieza con número: "2xl" -> "x2l" no se lee; se usa "s2xl".
const dartId = (s) => (/^[0-9]/.test(s) ? `s${s}` : s);
