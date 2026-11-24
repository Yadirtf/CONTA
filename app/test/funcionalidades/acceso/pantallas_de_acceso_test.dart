import 'package:conta_app/funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'package:conta_app/funcionalidades/acceso/presentacion/puerta_de_acceso.dart';
import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

void main() {
  testWidgets('entra con el celular y el código, sin ver nada de adentro antes', (tester) async {
    final controlador = ControladorDeAcceso(RepositorioDeAccesoFalso(), AlmacenEnMemoria(), reloj: () => DateTime.utc(2026, 11, 23, 15));
    await tester.pumpWidget(MaterialApp(
      theme: TemaConta.claro,
      home: PuertaDeAcceso(controlador: controlador, adentro: (_) => const Text('Adentro')),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Entra con tu celular'), findsOneWidget);
    expect(find.text('Adentro'), findsNothing);

    await tester.enterText(find.byType(TextField), '300 123 4567');
    await tester.tap(find.text('Enviarme el código'));
    await tester.pump();
    expect(find.text('Escribe el código'), findsOneWidget);
    expect(find.textContaining('300 123 4567'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '000000');
    await tester.pump();
    expect(find.textContaining('Te quedan 4 intentos'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '123456');
    await tester.pump();
    expect(find.text('Adentro'), findsOneWidget);
  });

  testWidgets('el botón principal mide al menos 48 dp para el dedo', (tester) async {
    final controlador = ControladorDeAcceso(RepositorioDeAccesoFalso(), AlmacenEnMemoria());
    await tester.pumpWidget(MaterialApp(
      theme: TemaConta.claro,
      home: PuertaDeAcceso(controlador: controlador, adentro: (_) => const SizedBox()),
    ));
    await tester.pumpAndSettle();
    expect(tester.getSize(find.byType(FilledButton)).height, greaterThanOrEqualTo(AlturaConta.toque));
  });
}
