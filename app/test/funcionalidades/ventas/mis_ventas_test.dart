import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/pantalla_listo.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/pantalla_mis_ventas.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';
import 'pantallas_de_venta_test.dart' show conTema;

VentaReciente _reciente(String id, EstadoDeLaVenta estado, {DocumentoDeLaVenta documento = DocumentoDeLaVenta.factura}) =>
    VentaReciente(
  id: id,
  numero: 'SETP99000000$id',
  emitidaEn: DateTime.utc(2026, 11, 27),
  comprador: 'Consumidor final',
  total: '7500.00',
  estado: estado,
  documento: documento,
);

void main() {
  testWidgets('«Listo» comparte la factura aprobada en un toque', (tester) async {
    final api = RepositorioDeVentasFalso()..estados = [EstadoDeLaVenta.aceptada];
    final compartidor = CompartidorFalso();
    final venta = ((await api.registrar(
      'e1',
      PedidoDeVenta(id: 'v1', carrito: const Carrito().agregar(gaseosa), medioDePago: MedioDePago.efectivo),
    )) as Exito<VentaEmitida>).valor;
    await tester.pumpWidget(
      conTema(
        PantallaListo(
          repositorio: api,
          empresaId: 'e1',
          venta: venta,
          cola: colaDePrueba(api, compartidor),
          esperar: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Compartir factura'));
    await tester.pumpAndSettle();
    expect(compartidor.compartidos.single.nombreDeArchivo, 'factura-SETP990000000.pdf');
  });

  testWidgets('«Listo» sin internet avisa que queda en cola', (tester) async {
    final api = RepositorioDeVentasFalso()
      ..estados = [EstadoDeLaVenta.aceptada]
      ..comprobantes = [const Rechazo(Rechazo.sinConexion, 'Sin conexión')];
    final venta = ((await api.registrar(
      'e1',
      PedidoDeVenta(id: 'v1', carrito: const Carrito().agregar(gaseosa), medioDePago: MedioDePago.efectivo),
    )) as Exito<VentaEmitida>).valor;
    final cola = ColaSinFin(api);
    await tester.pumpWidget(
      conTema(PantallaListo(repositorio: api, empresaId: 'e1', venta: venta, cola: cola, esperar: (_) async {})),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Compartir factura'));
    await tester.pump();
    expect(find.textContaining('Sin internet. La factura queda en cola'), findsOneWidget);
    cola.dispose();
  });

  testWidgets('«Mis ventas» lista las ventas y comparte las que no fueron rechazadas', (tester) async {
    final api = RepositorioDeVentasFalso()
      ..respuestaDeRecientes = Exito([
        _reciente('1', EstadoDeLaVenta.aceptada),
        _reciente('2', EstadoDeLaVenta.rechazada, documento: DocumentoDeLaVenta.pos),
      ]);
    final compartidor = CompartidorFalso();
    await tester.pumpWidget(
      conTema(PantallaMisVentas(repositorio: api, empresaId: 'e1', cola: colaDePrueba(api, compartidor))),
    );
    await tester.pumpAndSettle();
    expect(find.text('SETP990000001 · \$ 7.500'), findsOneWidget);
    expect(find.textContaining('No aceptada'), findsOneWidget);
    // HU-06.02: cada fila dice con qué documento salió.
    expect(find.textContaining('Factura electrónica · Consumidor final'), findsOneWidget);
    expect(find.textContaining('Tiquete POS electrónico · Consumidor final'), findsOneWidget);
    expect(find.byTooltip('Compartir factura SETP990000001'), findsOneWidget);
    expect(find.byTooltip('Compartir factura SETP990000002'), findsNothing);

    await tester.tap(find.byTooltip('Compartir factura SETP990000001'));
    await tester.pumpAndSettle();
    expect(compartidor.compartidos.single.numero, 'SETP990000001');
    expect(api.pedidosDeComprobante, ['1']);
  });

  testWidgets('«Mis ventas» muestra el aviso si no carga', (tester) async {
    final api = RepositorioDeVentasFalso()..respuestaDeRecientes = const Rechazo('permiso.denegado', 'No tienes permiso');
    await tester.pumpWidget(
      conTema(PantallaMisVentas(repositorio: api, empresaId: 'e1', cola: colaDePrueba(api, CompartidorFalso()))),
    );
    await tester.pumpAndSettle();
    expect(find.text('No tienes permiso'), findsOneWidget);
  });
}
