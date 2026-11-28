import 'package:conta_app/funcionalidades/configuracion_dian/presentacion/controlador_de_configuracion_dian.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/dominio/configuracion_dian.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';

void main() {
  test('si la API pide verificar de nuevo, pide el código una vez y repite lo que guardaba', () async {
    final repositorio = RepositorioDeConfiguracionDianFalso()..rechazos.add(pideVerificacion);
    var pedidas = 0;
    final c = ControladorDeConfiguracionDian(repositorio, 'e1', verificarDeNuevo: () async {
      pedidas++;
      return true;
    });
    expect(await c.guardarSiempreFactura(true), isTrue);
    expect(pedidas, 1);
    expect(repositorio.pedidos, [true, true]);
    expect(c.aviso, isNull);
  });

  test('si la persona no confirma el código, no se repite y queda el aviso', () async {
    final repositorio = RepositorioDeConfiguracionDianFalso()..rechazos.add(pideVerificacion);
    final c = ControladorDeConfiguracionDian(repositorio, 'e1', verificarDeNuevo: () async => false);
    expect(await c.guardarSiempreFactura(true), isFalse);
    expect(repositorio.pedidos, [true]);
    expect(c.aviso, contains('código'));
  });

  test('un rechazo de la API deja su mensaje', () async {
    final repositorio = RepositorioDeConfiguracionDianFalso()
      ..rechazos.add(const Rechazo('configuracion.nit-con-ventas', 'El NIT no cambia porque ya vendiste.'));
    final c = ControladorDeConfiguracionDian(repositorio, 'e1', verificarDeNuevo: () async => true);
    expect(await c.guardarSiempreFactura(false), isFalse);
    expect(c.aviso, 'El NIT no cambia porque ya vendiste.');
  });
}
