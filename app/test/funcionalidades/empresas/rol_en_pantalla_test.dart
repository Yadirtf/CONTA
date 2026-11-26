import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';
import 'package:conta_app/funcionalidades/empresas/presentacion/pantalla_de_empresa.dart';
import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

Future<void> _mostrar(WidgetTester tester, Empresa empresa, {VoidCallback? alVerPersonas}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: TemaConta.claro,
      home: PantallaDeEmpresa(
        empresa: empresa,
        repositorio: RepositorioDeEmpresasFalso([empresa]),
        alCambiar: () {},
        alVerPersonas: alVerPersonas,
        contenido: const Text('Lo de adentro'),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('adentro se ve el rol y el modo que mandó la API', (tester) async {
    await _mostrar(tester, Empresa(id: 'e1', razonSocial: 'Tienda', membresia: membresiaDe(Rol.cajero)));
    expect(find.text('Cajero · modo simple'), findsOneWidget);
    expect(find.byTooltip('Personas del negocio'), findsNothing);
  });

  testWidgets('quien puede gestionar personas ve el botón y lo abre', (tester) async {
    var abiertas = 0;
    await _mostrar(tester, Empresa(id: 'e1', razonSocial: 'Tienda', membresia: membresiaDe(Rol.dueno)), alVerPersonas: () => abiertas++);
    await tester.tap(find.byTooltip('Personas del negocio'));
    expect(abiertas, 1);
  });
}
