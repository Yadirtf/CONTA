import 'package:conta_app/funcionalidades/productos/dominio/productos.dart';
import 'package:conta_app/funcionalidades/productos/presentacion/pantalla_productos.dart';
import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

Future<void> _abrir(WidgetTester tester, RepositorioDeProductos api, {bool puedeCrear = true}) async {
  // Alto de sobra para que el formulario entero quepa sin desplazarse.
  await tester.binding.setSurfaceSize(const Size(360, 1400));
  await tester.pumpWidget(
    MaterialApp(
      theme: TemaConta.claro,
      home: PantallaProductos(repositorio: api, empresaId: 'e1', puedeCrear: puedeCrear),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('muestra lo que se cobra y cuánto es IVA, como lo separó la API', (tester) async {
    await _abrir(tester, RepositorioDeProductosFalso([gaseosa, arroz]));
    expect(find.text(r'$ 10.000'), findsOneWidget);
    expect(find.text(r'IVA 19 %: $ 1.596,64 · sin IVA $ 8.403,36'), findsOneWidget);
    expect(find.text('Sin IVA (excluido)'), findsOneWidget);
  });

  testWidgets('el cajero no ve «Producto nuevo»', (tester) async {
    await _abrir(tester, RepositorioDeProductosFalso([gaseosa]), puedeCrear: false);
    expect(find.text('Producto nuevo'), findsNothing);
  });

  testWidgets('crear un producto excluido: va con el IVA elegido y aparece en la lista', (tester) async {
    final api = RepositorioDeProductosFalso();
    await _abrir(tester, api);
    expect(find.text('Todavía no hay productos.'), findsOneWidget);
    await tester.tap(find.text('Producto nuevo'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'Nombre'), 'Arroz x 5 kg');
    await tester.enterText(find.widgetWithText(TextField, 'Precio de venta'), '18.000');
    await tester.tap(find.text('Sin IVA (excluido)'));
    await tester.pumpAndSettle();
    // Sin IVA no hay nada que incluir: la pregunta desaparece.
    expect(find.text('El precio ya incluye el IVA'), findsNothing);
    await tester.tap(find.text('Guardar producto'));
    await tester.pumpAndSettle();
    final enviado = api.creados.single;
    expect((enviado.precio, enviado.iva, enviado.precioIncluyeIva), ('18000', IvaDelProducto.excluido, true));
    expect(find.text('Arroz x 5 kg'), findsOneWidget);
  });

  testWidgets('un precio que no es pesos se avisa sin llamar a la API; el rechazo de la API se muestra', (
    tester,
  ) async {
    final api = RepositorioDeProductosFalso()..rechazoAlCrear = const Rechazo('permiso.denegado', 'No tienes permiso');
    await _abrir(tester, api);
    await tester.tap(find.text('Producto nuevo'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'Nombre'), 'Gaseosa');
    await tester.enterText(find.widgetWithText(TextField, 'Precio de venta'), 'mil');
    await tester.tap(find.text('Guardar producto'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Escribe el precio en pesos'), findsOneWidget);
    expect(api.creados, isEmpty);
    await tester.enterText(find.widgetWithText(TextField, 'Precio de venta'), '2.500');
    await tester.tap(find.text('Guardar producto'));
    await tester.pumpAndSettle();
    expect(find.text('No tienes permiso'), findsOneWidget);
    // Reintentar usa el mismo id: la API no crearía dos.
    expect(api.creados.single.id, isNotEmpty);
  });
}
