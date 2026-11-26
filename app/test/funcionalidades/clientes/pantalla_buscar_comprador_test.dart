import 'package:conta_app/funcionalidades/clientes/dominio/clientes.dart';
import 'package:conta_app/funcionalidades/clientes/presentacion/pantalla_buscar_comprador.dart';
import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

/// Abre la pantalla desde un botón y guarda lo que devuelve al cerrarse.
Future<List<Comprador?>> _abrir(WidgetTester tester, RepositorioDeClientes api) async {
  final elegidos = <Comprador?>[];
  await tester.binding.setSurfaceSize(const Size(360, 740));
  await tester.pumpWidget(
    MaterialApp(
      theme: TemaConta.claro,
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () async => elegidos.add(
            await Navigator.of(context).push<Comprador>(
              MaterialPageRoute(builder: (_) => PantallaBuscarComprador(repositorio: api, empresaId: 'e1')),
            ),
          ),
          child: const Text('vender'),
        ),
      ),
    ),
  );
  await tester.tap(find.text('vender'));
  await tester.pumpAndSettle();
  return elegidos;
}

void main() {
  testWidgets('consumidor final en un toque', (tester) async {
    final elegidos = await _abrir(tester, RepositorioDeClientesFalso());
    await tester.tap(find.text('Consumidor final (sin datos)'));
    await tester.pumpAndSettle();
    expect(elegidos.single?.esConsumidorFinal, isTrue);
  });

  testWidgets('un NIT nuevo muestra su dígito; uno que ya es comprador muestra su tarjeta', (tester) async {
    final elegidos = await _abrir(tester, RepositorioDeClientesFalso([ferreteria]));
    await tester.enterText(find.byType(TextField), '900373076');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.text('Si es un NIT, con su dígito queda: 900373076-7'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '800');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.textContaining('Si es un NIT'), findsNothing);
    await tester.enterText(find.byType(TextField), '800197268');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.textContaining('Si es un NIT'), findsNothing);
    await tester.tap(find.text('Ferretería El Tornillo'));
    await tester.pumpAndSettle();
    expect(elegidos.single, ferreteria);
  });

  testWidgets('crea un comprador nuevo con el número ya escrito', (tester) async {
    final api = RepositorioDeClientesFalso();
    final elegidos = await _abrir(tester, api);
    await tester.enterText(find.byType(TextField), '1020304050');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.text('No hay compradores con ese documento.'), findsOneWidget);
    await tester.tap(find.text('Crear comprador nuevo'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'Nombre completo'), 'Rosa Pérez');
    await tester.tap(find.text('Guardar comprador'));
    await tester.pumpAndSettle();
    expect(api.creados.single.numero, '1020304050');
    expect(elegidos.single?.nombre, 'Rosa Pérez');
  });
}
