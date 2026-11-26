import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';
import 'package:conta_app/funcionalidades/empresas/presentacion/pantalla_de_empresa.dart';
import 'package:conta_app/funcionalidades/empresas/presentacion/puerta_de_empresa.dart';
import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

/// Contenido de adentro que recuerda cuántas veces se creó: si sobrevive a un cambio de empresa, hay fuga.
class _Contenido extends StatefulWidget {
  const _Contenido(this.empresa);
  final Empresa empresa;
  static final creados = <String>[];

  @override
  State<_Contenido> createState() => _ContenidoState();
}

class _ContenidoState extends State<_Contenido> {
  late final String _deQuien = widget.empresa.razonSocial;

  @override
  void initState() {
    super.initState();
    _Contenido.creados.add(_deQuien);
  }

  @override
  Widget build(BuildContext context) => Text('Datos de $_deQuien');
}

void main() {
  // Criterio de HU-04.02: con 3 empresas, al cambiar de empresa todo lo mostrado es de la elegida.
  testWidgets('con 3 empresas, al cambiar todo lo que se ve es de la empresa elegida', (tester) async {
    final repositorio = RepositorioDeEmpresasFalso([drogueria, ferreteria, panaderia]);
    _Contenido.creados.clear();
    await tester.pumpWidget(
      MaterialApp(
        theme: TemaConta.claro,
        home: PuertaDeEmpresa(
          repositorio: repositorio,
          adentro: (_, empresa, cambiar) => PantallaDeEmpresa(
            empresa: empresa,
            repositorio: repositorio,
            alCambiar: cambiar,
            contenido: _Contenido(empresa),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('¿En qué negocio vas a trabajar?'), findsOneWidget);

    for (final elegida in [ferreteria, drogueria, panaderia]) {
      await tester.tap(find.text(elegida.razonSocial));
      await tester.pumpAndSettle();
      expect(find.text('Datos de ${elegida.razonSocial}'), findsOneWidget);
      for (final otra in repositorio.empresas.where((e) => e != elegida)) {
        expect(find.textContaining(otra.razonSocial), findsNothing);
      }
      await tester.tap(find.byTooltip('Cambiar de negocio'));
      await tester.pumpAndSettle();
    }
    expect(repositorio.pedidasDentro, [ferreteria.id, drogueria.id, panaderia.id]);
    expect(_Contenido.creados, ['Ferretería El Tornillo', 'Droguería Salud', 'Panadería La Espiga']);
  });

  testWidgets('si la API no reconoce la empresa, se ve el aviso y no los datos', (tester) async {
    final repositorio = RepositorioDeEmpresasFalso([panaderia]);
    const retirada = Empresa(id: 'e-retirada', razonSocial: 'Negocio retirado');
    await tester.pumpWidget(
      MaterialApp(
        theme: TemaConta.claro,
        home: PantallaDeEmpresa(
          empresa: retirada,
          repositorio: repositorio,
          alCambiar: () {},
          contenido: const Text('Datos secretos'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('No encontramos esa empresa'), findsOneWidget);
    expect(find.text('Datos secretos'), findsNothing);
  });

  testWidgets('sin empresas, crea la primera y entra a ella', (tester) async {
    final repositorio = RepositorioDeEmpresasFalso();
    await tester.pumpWidget(
      MaterialApp(
        theme: TemaConta.claro,
        home: PuertaDeEmpresa(
          repositorio: repositorio,
          adentro: (_, empresa, cambiar) => PantallaDeEmpresa(
            empresa: empresa,
            repositorio: repositorio,
            alCambiar: cambiar,
            contenido: _Contenido(empresa),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Tienda Doña Rosa');
    await tester.tap(find.text('Crear y entrar'));
    await tester.pumpAndSettle();
    expect(find.text('Datos de Tienda Doña Rosa'), findsOneWidget);
  });
}
