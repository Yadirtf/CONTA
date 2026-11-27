import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/pantalla_listo.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/pantalla_vender.dart';
import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'dobles.dart';

Widget conTema(Widget hijo) => MaterialApp(theme: TemaConta.claro, home: hijo);

void main() {
  testWidgets('vende en 3 toques: producto, cobrar y confirmar', (tester) async {
    final api = RepositorioDeVentasFalso();
    await tester.pumpWidget(
      conTema(
        PantallaVender(
          repositorio: api,
          empresaId: 'e1',
          buscarArticulos: buscarFijo,
          cola: colaDePrueba(api, CompartidorFalso()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Gaseosa 400 ml')); // 1
    await tester.pump();
    await tester.tap(find.text('Cobrar \$ 2.500 · 1 producto')); // 2
    await tester.pumpAndSettle();
    expect(find.text('Consumidor final'), findsOneWidget);
    await tester.tap(find.text('Confirmar venta · \$ 2.500')); // 3
    await tester.pump();
    await tester.pump();

    expect(api.pedidos.single.medioDePago, MedioDePago.efectivo);
    expect(api.pedidos.single.comprador, isNull);
    expect(find.text('Factura SETP990000000'), findsOneWidget);
    expect(find.text('Enviándose a la DIAN'), findsOneWidget);
    // Sale del «Listo» con una venta nueva, vacía.
    await tester.tap(find.text('Nueva venta'));
    await tester.pumpAndSettle();
    expect(find.text('Toca un producto para vender'), findsOneWidget);
    // Deja correr las consultas que quedaron programadas: «Listo» ya se cerró y no pregunta más.
    await tester.pump(const Duration(minutes: 1));
    expect(api.consultas, isEmpty);
  });

  testWidgets('en «Cobrar» cambia la cantidad, el medio de pago y el comprador', (tester) async {
    final api = RepositorioDeVentasFalso();
    await tester.pumpWidget(
      conTema(
        PantallaVender(
          repositorio: api,
          empresaId: 'e1',
          buscarArticulos: buscarFijo,
          cola: colaDePrueba(api, CompartidorFalso()),
          elegirComprador: (_) async => const CompradorDeLaVenta(id: 'c1', nombre: 'Rosa Pérez'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Arroz 500 g'));
    await tester.pump();
    await tester.tap(find.textContaining('Cobrar'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Uno más'));
    await tester.tap(find.text('Nequi, Daviplata o transferencia'));
    await tester.tap(find.text('Cambiar'));
    await tester.pumpAndSettle();
    expect(find.text('Rosa Pérez'), findsOneWidget);
    await tester.tap(find.text('Confirmar venta · \$ 6.401'));
    await tester.pump();
    await tester.pump();

    final pedido = api.pedidos.single;
    expect(pedido.carrito.cantidadDe(arroz.id), 2);
    expect(pedido.medioDePago, MedioDePago.transferencia);
    expect(pedido.comprador?.id, 'c1');
    await tester.pump(const Duration(minutes: 1));
  });

  testWidgets('si falla, se queda en «Cobrar» con el aviso y no pierde la venta', (tester) async {
    final api = RepositorioDeVentasFalso()
      ..rechazoAlRegistrar = const Rechazo(
        'facturacion.no-habilitada',
        'Tu negocio todavía no está listo para facturar',
      );
    await tester.pumpWidget(
      conTema(
        PantallaVender(
          repositorio: api,
          empresaId: 'e1',
          buscarArticulos: buscarFijo,
          cola: colaDePrueba(api, CompartidorFalso()),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Gaseosa 400 ml'));
    await tester.pump();
    await tester.tap(find.textContaining('Cobrar'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Confirmar venta'));
    await tester.pump();
    await tester.pump();
    expect(find.text('Tu negocio todavía no está listo para facturar'), findsOneWidget);
    expect(find.textContaining('Confirmar venta'), findsOneWidget);
  });

  testWidgets('«Listo» muestra los motivos si la DIAN no la aceptó', (tester) async {
    final api = RepositorioDeVentasFalso()..estados = [EstadoDeLaVenta.rechazada];
    final venta = ((await api.registrar(
      'e1',
      PedidoDeVenta(id: 'v1', carrito: const Carrito().agregar(gaseosa), medioDePago: MedioDePago.efectivo),
    )) as Exito<VentaEmitida>).valor;
    await tester.pumpWidget(
      conTema(PantallaListo(
          repositorio: api,
          empresaId: 'e1',
          venta: venta,
          cola: colaDePrueba(api, CompartidorFalso()),
          esperar: (_) async {},
        )),
    );
    await tester.pumpAndSettle();
    expect(find.text('La DIAN no la aceptó'), findsWidgets);
    expect(find.text('Regla FAD06: valor del tributo'), findsOneWidget);
    // Una factura rechazada no se comparte.
    expect(find.text('Compartir factura'), findsNothing);
  });
}
