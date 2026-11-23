// Pruebas de los generadores de tokens. Uso: node --test herramientas/diseno/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { razonDeContraste } from './contraste.mjs';
import { revisarTokens } from './revisar-tokens.mjs';
import { generarCss } from './generar-css.mjs';
import { generarDart } from './generar-dart.mjs';
import { enCamello, enGuiones } from './nombres.mjs';

const tokens = () => ({
  color: {
    claro: { fondo: '#ffffff', texto: '#111111', sobreAcento: '#ffffff', acento: '#1d4ed8' },
    oscuro: { fondo: '#111111', texto: '#f5f5f5', sobreAcento: '#111111', acento: '#8c9eff' },
  },
  contrastes: [
    { primero: 'texto', fondo: 'fondo', minimo: 4.5 },
    { primero: 'sobreAcento', fondo: 'acento', minimo: 4.5 },
  ],
  espacio: { s1: 4, s4: 16 },
  radio: { boton: 12, pildora: 999 },
  tipografia: {
    familias: { web: 'Inter', app: 'Roboto' },
    respaldo: 'system-ui, sans-serif',
    tamanos: { cuerpo: 16, total: 36 },
    pesos: { normal: 400, medio: 600, fuerte: 700 },
  },
  movimiento: { curva: 'cubic-bezier(0.2, 0, 0, 1)', duraciones: { rapida: 120 } },
  alturas: { toque: 48 },
});

test('contraste WCAG: negro sobre blanco es 21:1 y un color consigo mismo 1:1', () => {
  assert.equal(razonDeContraste('#000000', '#ffffff'), 21);
  assert.equal(razonDeContraste('#1d4ed8', '#1d4ed8'), 1);
  assert.equal(razonDeContraste('#767676', '#ffffff').toFixed(2), '4.54');
});

test('contraste rechaza un color que no es #rrggbb', () => {
  assert.throws(() => razonDeContraste('blue', '#ffffff'), /Color inválido/);
});

test('tokens válidos no tienen fallas', () => {
  assert.deepEqual(revisarTokens(tokens()), []);
});

test('detecta un par sin contraste AA, con el modo y la razón', () => {
  const t = tokens();
  t.color.oscuro.texto = '#333333';
  const [falla] = revisarTokens(t);
  assert.match(falla, /^oscuro: texto sobre fondo tiene 1\.\d\d:1 y pide 4\.5:1$/);
});

test('detecta modos con colores distintos y pares con nombres inexistentes', () => {
  const t = tokens();
  delete t.color.oscuro.acento;
  t.contrastes.push({ primero: 'borde', fondo: 'fondo', minimo: 3 });
  const fallas = revisarTokens(t);
  assert.ok(fallas.includes('Los modos claro y oscuro no tienen los mismos colores'));
  assert.ok(fallas.some((f) => f.includes('borde/fondo nombra un color que no existe')));
});

test('nombres: camello a guiones y vuelta', () => {
  assert.equal(enGuiones('sobreAcento'), 'sobre-acento');
  assert.equal(enGuiones('exitoFondo'), 'exito-fondo');
  assert.equal(enCamello('sobre-acento'), 'sobreAcento');
});

test('CSS: variables del modo claro, oscuro por sistema y forzado con data-tema', () => {
  const css = generarCss(tokens());
  assert.match(css, /--conta-color-sobre-acento: #ffffff;/);
  assert.match(css, /--conta-espacio-s4: 16px;/);
  assert.match(css, /--conta-duracion-rapida: 120ms;/);
  assert.match(css, /--conta-altura-toque: 48px;/);
  assert.match(css, /--conta-fuente: 'Inter', system-ui, sans-serif;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-tema='claro'\]\) \{\n {4}--conta-color-fondo: #111111;/);
  assert.match(css, /:root\[data-tema='oscuro'\] \{[^}]*--conta-color-acento: #8c9eff;/);
});

test('Dart: paletas constantes con ARGB y escalas en double', () => {
  const dart = generarDart(tokens());
  assert.match(dart, /final Color sobreAcento;/);
  assert.match(dart, /static const claro = PaletaConta\(.*?acento: Color\(0xFF1D4ED8\),/s);
  assert.match(dart, /static const oscuro = PaletaConta\(.*?fondo: Color\(0xFF111111\),/s);
  assert.match(dart, /static const s4 = 16\.0;/);
  assert.match(dart, /static const pildora = 999\.0;/);
  assert.match(dart, /static const familia = 'Roboto';/);
  assert.match(dart, /static const toque = 48\.0;/);
  assert.match(dart, /static const duracionRapida = Duration\(milliseconds: 120\);/);
});
