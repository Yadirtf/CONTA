import 'package:conta_app/app.dart';
import 'package:conta_app/funcionalidades/acceso/dominio/acceso.dart';
import 'package:conta_app/funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'package:conta_app/funcionalidades/salud/dominio/estado_api.dart';
import 'package:flutter_test/flutter_test.dart';

import 'funcionalidades/acceso/dobles.dart';

class _RepositorioFijo implements RepositorioSalud {
  @override
  Future<EstadoApi> consultar() async => const ApiViva('0.1.0');
}

void main() {
  testWidgets('sin sesión la app pide el celular', (tester) async {
    final acceso = ControladorDeAcceso(RepositorioDeAccesoFalso(), AlmacenEnMemoria());
    await tester.pumpWidget(ContaApp(acceso: acceso, repositorioSalud: _RepositorioFijo()));
    await tester.pumpAndSettle();
    expect(find.text('Entra con tu celular'), findsOneWidget);
  });

  testWidgets('con sesión muestra el estado del servidor', (tester) async {
    final almacen = AlmacenEnMemoria()
      ..sesion = SesionGuardada(token: 'x', venceEn: DateTime.now().add(const Duration(days: 1)), celular: '+573001234567');
    final acceso = ControladorDeAcceso(RepositorioDeAccesoFalso(), almacen);
    await tester.pumpWidget(ContaApp(acceso: acceso, repositorioSalud: _RepositorioFijo()));
    await tester.pumpAndSettle();
    expect(find.text('Conectado (versión 0.1.0).'), findsOneWidget);
  });
}
