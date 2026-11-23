// Pruebas del revisor de artefactos. Uso: node --test herramientas/ci/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisar } from './revisar-artefactos.mjs';

const flujo = (conPaso) => `jobs:
  a:
    steps:
      - uses: actions/checkout@v4
${conPaso}
      - run: echo fin
`;

test('acepta un paso con retention-days: 2', () => {
  const paso = `      - name: Subir reporte
        uses: actions/upload-artifact@v4
        with:
          name: reporte
          retention-days: 2`;
  assert.deepEqual(revisar('x.yml', flujo(paso)), []);
});

test('rechaza un paso sin retention-days', () => {
  const paso = `      - uses: actions/upload-artifact@v4
        with:
          name: reporte`;
  assert.deepEqual(revisar('x.yml', flujo(paso)), ['x.yml:5']);
});

test('rechaza otro número de días', () => {
  const paso = `      - uses: actions/upload-artifact@v4
        with:
          retention-days: 30`;
  assert.deepEqual(revisar('x.yml', flujo(paso)), ['x.yml:5']);
});

test('no toma el retention-days del paso siguiente', () => {
  const texto = `jobs:
  a:
    steps:
      - uses: actions/upload-artifact@v4
        with:
          name: uno
      - uses: actions/upload-artifact@v4
        with:
          retention-days: 2
`;
  assert.deepEqual(revisar('x.yml', texto), ['x.yml:4']);
});

test('ignora download-artifact', () => {
  assert.deepEqual(revisar('x.yml', flujo('      - uses: actions/download-artifact@v4')), []);
});
