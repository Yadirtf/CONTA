// Pruebas de la regla contra estilos sueltos. Uso: node --test herramientas/diseno/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarTexto } from './estilos/revisar-texto.mjs';
import { seRevisa } from './revisar-estilos.mjs';

const reglas = (ruta, texto) => revisarTexto(ruta, texto).map((h) => h.regla);

test('marca colores escritos a mano en Dart', () => {
  assert.deepEqual(reglas('app/lib/x.dart', 'color: Color(0xFF0B6B53),'), ['color-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'color: Colors.red,'), ['color-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'Color.fromARGB(255, 1, 2, 3)'), ['color-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'color: Colors.transparent,'), []);
  assert.deepEqual(reglas('app/lib/x.dart', 'color: context.paleta.acento,'), []);
});

test('marca espacios, radios y tamaños de letra escritos a mano en Dart', () => {
  assert.deepEqual(reglas('app/lib/x.dart', 'padding: const EdgeInsets.all(24),'), ['espacio-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'EdgeInsets.symmetric(horizontal: 16)'), ['espacio-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'const SizedBox(height: 12)'), ['espacio-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'BorderRadius.circular(8)'), ['forma-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'TextStyle(fontSize: 18)'), ['forma-dart']);
  assert.deepEqual(reglas('app/lib/x.dart', 'EdgeInsets.all(EspacioConta.s6)'), []);
  assert.deepEqual(reglas('app/lib/x.dart', 'EdgeInsets.zero'), []);
  assert.deepEqual(reglas('app/lib/x.dart', 'const SizedBox(height: EspacioConta.s4)'), []);
});

test('marca colores y medidas escritos a mano en CSS y TSX', () => {
  assert.deepEqual(reglas('web/sitio/src/a.css', '  color: #0b6b53;'), ['color-hex']);
  assert.deepEqual(reglas('web/sitio/src/a.css', '  background: rgb(0 0 0 / 50%);'), ['color-funcion']);
  assert.deepEqual(reglas('web/sitio/src/a.css', '  color: white;'), ['color-nombre']);
  assert.deepEqual(reglas('web/sitio/src/a.css', '  padding: 16px 8px;'), ['medida-css']);
  assert.deepEqual(reglas('web/sitio/src/a.tsx', "<p style={{ color: '#fff' }}>"), ['color-hex']);
  assert.deepEqual(reglas('web/sitio/src/a.tsx', '<p style={{ fontSize: 18 }}>'), ['medida-estilo-en-linea']);
  assert.deepEqual(reglas('web/sitio/src/a.tsx', "<p style={{ padding: '12px' }}>"), ['medida-estilo-en-linea']);
});

test('acepta los tokens, el cero y lo que no es medida de diseño', () => {
  assert.deepEqual(reglas('web/sitio/src/a.css', '  padding: var(--conta-espacio-s4);'), []);
  assert.deepEqual(reglas('web/sitio/src/a.css', '  margin: 0 auto;'), []);
  assert.deepEqual(reglas('web/sitio/src/a.css', '  outline: 2px solid var(--conta-color-foco);'), []);
  assert.deepEqual(reglas('web/sitio/src/a.css', '#principal {'), []);
  assert.deepEqual(reglas('web/sitio/src/a.tsx', "<p style={{ color: 'var(--conta-color-texto)' }}>"), []);
});

test('ignora los comentarios y admite una excepción con motivo', () => {
  assert.deepEqual(reglas('app/lib/x.dart', '// Antes era Color(0xFF0B6B53)'), []);
  assert.deepEqual(reglas('web/sitio/src/a.css', '/* el verde #0b6b53 quedó atrás */'), []);
  assert.deepEqual(reglas('app/lib/x.dart', 'Colors.red, // estilo-permitido: logo del banco'), []);
  assert.deepEqual(reglas('app/lib/x.dart', 'Colors.red, // estilo-permitido:'), ['color-dart']);
});

test('no revisa el módulo de tema ni las pruebas', () => {
  assert.equal(seRevisa('app/lib/nucleo/tema/tokens_conta.g.dart'), false);
  assert.equal(seRevisa('web/consola/src/compartido/estilos/tokens.css'), false);
  assert.equal(seRevisa('web/sitio/src/funcionalidades/inicio/ui/portada.test.tsx'), false);
  assert.equal(seRevisa('app/lib/funcionalidades/acceso/presentacion/pantalla_celular.dart'), true);
});
