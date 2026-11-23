import 'dart:io';

import 'package:test/test.dart';

import '../../tool/reglas_de_dependencia.dart';

List<String> nombres(List<Violacion> v) => v.map((e) => e.regla.nombre).toList();

void main() {
  test('prohíbe importar los datos/ de otra funcionalidad', () {
    final v = revisar({
      'lib/funcionalidades/caja/datos/repositorio_caja.dart':
          "import '../../facturacion/datos/repositorio_facturas.dart';\n",
      'lib/funcionalidades/caja/presentacion/pantalla.dart':
          "import 'package:conta_app/funcionalidades/facturacion/datos/cliente.dart';\n",
    });
    expect(nombres(v), ['funcionalidad-sin-datos-ajenos', 'funcionalidad-sin-datos-ajenos']);
    expect(v.first.toString(), contains('error funcionalidad-sin-datos-ajenos'));
  });

  test('permite usar los datos/ de la misma funcionalidad', () {
    final v = revisar({
      'lib/funcionalidades/caja/presentacion/pantalla.dart': "import '../datos/repositorio_caja.dart';\n",
    });
    expect(v, isEmpty);
  });

  test('prohíbe Flutter, http y dart:io en el dominio', () {
    final v = revisar({
      'lib/funcionalidades/caja/dominio/venta.dart': '''
import 'dart:async';
import 'dart:io';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart';
import 'package:meta/meta.dart';
''',
    });
    expect(nombres(v), ['dominio-sin-frameworks', 'dominio-sin-frameworks', 'dominio-sin-frameworks']);
  });

  test('prohíbe que el dominio importe datos/ o presentacion/', () {
    final v = revisar({
      'lib/funcionalidades/caja/dominio/venta.dart':
          "import '../datos/repositorio_caja.dart';\nimport '../presentacion/x.dart';\n",
    });
    expect(nombres(v), ['dominio-sin-otras-capas', 'dominio-sin-otras-capas']);
  });

  test('el código real de lib/ cumple todas las reglas', () {
    final archivos = {
      for (final f in Directory('lib').listSync(recursive: true).whereType<File>())
        if (f.path.endsWith('.dart')) f.path.replaceAll(r'\', '/'): f.readAsStringSync(),
    };
    expect(revisar(archivos).map((e) => e.toString()), isEmpty);
  });
}
