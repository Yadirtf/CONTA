import 'package:conta_app/funcionalidades/configuracion_dian/dominio/lo_que_se_escribe.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/presentacion/pantalla_configuracion_dian.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import '../verificacion/dobles.dart';
import 'dobles.dart';

Widget _pantalla(RepositorioDeConfiguracionDianFalso repositorio, {RepositorioDeVerificacionFalso? verificacion}) =>
    MaterialApp(
      home: PantallaConfiguracionDian(
        repositorio: repositorio,
        verificacion: verificacion ?? RepositorioDeVerificacionFalso(),
        empresaId: 'e1',
        modoContador: false,
      ),
    );

void main() {
  testWidgets('muestra lo que falta para facturar en tarjetas', (tester) async {
    await tester.pumpWidget(_pantalla(RepositorioDeConfiguracionDianFalso()));
    await tester.pumpAndSettle();
    expect(find.text('Lo que falta para facturar'), findsOneWidget);
    for (final t in ['Datos del RUT', 'Resolución de factura', 'Software de factura', 'Tiquete POS', 'Siempre factura']) {
      expect(find.text(t), findsOneWidget);
    }
  });

  testWidgets('el PIN se escribe tapado y no se queda en la pantalla', (tester) async {
    final repositorio = RepositorioDeConfiguracionDianFalso();
    await tester.pumpWidget(_pantalla(repositorio));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Software de factura'));
    await tester.pumpAndSettle();
    final pin = find.widgetWithText(TextField, 'PIN del software');
    expect(tester.widget<TextField>(pin).obscureText, isTrue);
    await tester.enterText(find.widgetWithText(TextField, 'Identificador del software'), 'S1');
    await tester.enterText(pin, 'pin2468');
    await tester.enterText(find.widgetWithText(TextField, 'TestSetId del set de pruebas'), 'T1');
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();
    final enviado = repositorio.pedidos.single as SoftwareNuevo;
    expect((enviado.idSoftware, enviado.pin, enviado.testSetId), ('s1', 'pin2468', 't1'));
    expect(find.text('pin2468'), findsNothing);
  });

  testWidgets('si la API pide confirmar, se escribe el código y se guarda', (tester) async {
    final repositorio = RepositorioDeConfiguracionDianFalso()..rechazos.add(pideVerificacion);
    final verificacion = RepositorioDeVerificacionFalso(appConfigurada: true);
    await tester.pumpWidget(_pantalla(repositorio, verificacion: verificacion));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(find.text('Confirma que eres tú'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'Código'), RepositorioDeVerificacionFalso.codigoBueno);
    await tester.pumpAndSettle();
    expect(find.text('Confirma que eres tú'), findsNothing);
    expect(repositorio.pedidos, [true, true]);
  });
}
