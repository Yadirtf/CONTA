import 'package:conta_app/app.dart';
import 'package:conta_app/funcionalidades/salud/dominio/estado_api.dart';
import 'package:flutter_test/flutter_test.dart';

class _RepositorioFijo implements RepositorioSalud {
  @override
  Future<EstadoApi> consultar() async => const ApiViva('0.1.0');
}

void main() {
  testWidgets('la pantalla de inicio muestra el estado del servidor', (tester) async {
    await tester.pumpWidget(ContaApp(repositorioSalud: _RepositorioFijo()));
    expect(find.text('Conectando…'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('Conectado (versión 0.1.0).'), findsOneWidget);
  });
}
