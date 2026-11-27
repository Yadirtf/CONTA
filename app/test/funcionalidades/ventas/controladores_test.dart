import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/controlador_de_estado.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/controlador_de_venta.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';

void main() {
  group('ControladorDeVenta', () {
    var n = 0;
    String ids() => 'id-${++n}';

    test('reintentar después de un fallo usa el mismo id: la API no crea dos ventas', () async {
      final api = RepositorioDeVentasFalso()..rechazoAlRegistrar = const Rechazo('sin-conexion', 'Sin conexión');
      final venta = ControladorDeVenta(api, 'e1', nuevoId: ids)..agregar(gaseosa);
      expect(await venta.confirmar(), isNull);
      expect(venta.aviso, 'Sin conexión');
      expect(venta.carrito.vacio, isFalse);
      final emitida = await venta.confirmar();
      expect(emitida?.numero, 'SETP990000000');
      expect(api.pedidos.map((p) => p.id).toSet(), hasLength(1));
      // Después de vender, la siguiente empieza vacía, en efectivo, a consumidor final y con otro id.
      expect(venta.carrito.vacio, isTrue);
      venta.agregar(arroz);
      await venta.confirmar();
      expect(api.pedidos.last.id, isNot(api.pedidos.first.id));
    });

    test('si el pedido cambia después de un fallo, va con otro id', () async {
      final api = RepositorioDeVentasFalso()..rechazoAlRegistrar = const Rechazo('sin-conexion', 'Sin conexión');
      final venta = ControladorDeVenta(api, 'e1', nuevoId: ids)..agregar(gaseosa);
      await venta.confirmar();
      venta.elegirMedio(MedioDePago.transferencia);
      await venta.confirmar();
      expect(api.pedidos[0].id, isNot(api.pedidos[1].id));
      expect(api.pedidos[1].medioDePago, MedioDePago.transferencia);
    });

    test('un carrito vacío no se envía', () async {
      final api = RepositorioDeVentasFalso();
      expect(await ControladorDeVenta(api, 'e1').confirmar(), isNull);
      expect(api.pedidos, isEmpty);
    });
  });

  group('ControladorDeEstado', () {
    Future<VentaEmitida> vendida(RepositorioDeVentasFalso api) async => ((await api.registrar(
      'e1',
      PedidoDeVenta(id: 'v1', carrito: const Carrito().agregar(gaseosa), medioDePago: MedioDePago.efectivo),
    )) as Exito<VentaEmitida>).valor;

    test('pregunta con esperas crecientes y para cuando la DIAN responde', () async {
      final api = RepositorioDeVentasFalso()..estados = [EstadoDeLaVenta.pendiente, EstadoDeLaVenta.aceptada];
      final esperas = <Duration>[];
      final estado = ControladorDeEstado(api, 'e1', await vendida(api), esperar: (d) async => esperas.add(d));
      await estado.seguir();
      expect(estado.venta.estado, EstadoDeLaVenta.aceptada);
      expect(esperas, const [Duration(seconds: 2), Duration(seconds: 4)]);
      expect(estado.sinRespuestaAun, isFalse);
    });

    test('después de la última espera deja de preguntar y lo dice', () async {
      final api = RepositorioDeVentasFalso();
      final estado = ControladorDeEstado(api, 'e1', await vendida(api), esperar: (_) async {});
      await estado.seguir();
      expect(api.consultas, hasLength(5));
      expect(estado.sinRespuestaAun, isTrue);
    });
  });
}
