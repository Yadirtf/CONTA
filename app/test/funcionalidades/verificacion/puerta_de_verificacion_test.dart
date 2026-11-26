import 'package:conta_app/funcionalidades/verificacion/presentacion/componentes/codigo_qr.dart';
import 'package:conta_app/funcionalidades/verificacion/presentacion/puerta_de_verificacion.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

Widget _puerta(RepositorioDeVerificacionFalso repositorio, {required bool exigida, VoidCallback? alCancelar}) => MaterialApp(
  home: PuertaDeVerificacion(
    exigida: exigida,
    repositorio: repositorio,
    alCancelar: alCancelar ?? () {},
    adentro: (_) => const Text('Adentro del negocio'),
  ),
);

Finder _seleccionable(String texto) => find.byWidgetPredicate((w) => w is SelectableText && w.data == texto);

void main() {
  testWidgets('un negocio que no la exige entra directo, sin preguntar a la API', (tester) async {
    final repositorio = RepositorioDeVerificacionFalso();
    await tester.pumpWidget(_puerta(repositorio, exigida: false));
    expect(find.text('Adentro del negocio'), findsOneWidget);
    expect(repositorio.codigosEnviados, isEmpty);
  });

  testWidgets('la primera vez muestra el QR y la clave; con el código pasa a los códigos de recuperación', (tester) async {
    await tester.pumpWidget(_puerta(RepositorioDeVerificacionFalso(), exigida: true));
    await tester.pumpAndSettle();
    // El campo del código tiene el foco: la lista se desplaza hasta él y el título queda fuera de la pantalla.
    expect(find.textContaining('Para entrar como contador'), findsOneWidget);
    expect(find.byType(CodigoQr), findsOneWidget);
    expect(_seleccionable('JBSW Y3DP EHPK 3PXP'), findsOneWidget);

    await tester.enterText(find.byType(TextField), RepositorioDeVerificacionFalso.codigoBueno);
    await tester.pumpAndSettle();
    expect(find.text('Guarda estos códigos'), findsOneWidget);
    expect(_seleccionable('ABCDE-FGHJK\nKMNPQ-RSTUV'), findsOneWidget);

    await tester.tap(find.text('Ya los guardé'));
    await tester.pumpAndSettle();
    expect(find.text('Adentro del negocio'), findsOneWidget);
  });

  testWidgets('con la app configurada pide el código; uno incorrecto deja un aviso', (tester) async {
    await tester.pumpWidget(_puerta(RepositorioDeVerificacionFalso(appConfigurada: true), exigida: true));
    await tester.pumpAndSettle();
    expect(find.text('Confirma que eres tú'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '000000');
    await tester.pumpAndSettle();
    expect(find.text('El código no coincide.'), findsOneWidget);
    await tester.enterText(find.byType(TextField), RepositorioDeVerificacionFalso.codigoBueno);
    await tester.pumpAndSettle();
    expect(find.text('Adentro del negocio'), findsOneWidget);
  });

  testWidgets('con un código de recuperación, si se perdió el teléfono', (tester) async {
    await tester.pumpWidget(_puerta(RepositorioDeVerificacionFalso(appConfigurada: true), exigida: true));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Perdí el teléfono: usar un código de recuperación'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'KMNPQ-RSTUV');
    await tester.tap(find.text('Confirmar'));
    await tester.pumpAndSettle();
    expect(find.text('Adentro del negocio'), findsOneWidget);
  });

  testWidgets('«Ahora no» vuelve a la lista de negocios', (tester) async {
    var cancelado = false;
    await tester.pumpWidget(_puerta(RepositorioDeVerificacionFalso(appConfigurada: true), exigida: true, alCancelar: () => cancelado = true));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ahora no'));
    expect(cancelado, isTrue);
  });
}
