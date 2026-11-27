import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';

void main() {
  group('centavos exactos', () {
    test('lee y escribe montos de la API sin double', () {
      expect(centavosDe('2500.00'), BigInt.from(250000));
      expect(centavosDe('3200.5'), BigInt.from(320050));
      expect(centavosDe('7'), BigInt.from(700));
      expect(montoDe(BigInt.from(320050)), '3200.50');
      // 0,1 + 0,2 con double da 0,30000000000000004; con centavos, 0,30.
      expect(montoDe(centavosDe('0.10') + centavosDe('0.20')), '0.30');
    });

    test('rechaza lo que no es un monto de la API', () {
      for (final malo in ['', '-1', '1,5', '1.234', '1e3', ' 1']) {
        expect(() => centavosDe(malo), throwsFormatException, reason: malo);
      }
    });
  });

  group('carrito', () {
    test('un toque suma una unidad y el total es exacto', () {
      final carrito = const Carrito().agregar(gaseosa).agregar(gaseosa).agregar(arroz);
      expect(carrito.cantidadDe(gaseosa.id), 2);
      expect(carrito.unidades, 3);
      expect(carrito.total, '8200.50');
      expect(carrito.lineas.map((l) => l.articulo.id), [gaseosa.id, arroz.id]);
    });

    test('cambiar a cero lo saca; cantidades fuera de rango no cambian nada', () {
      final carrito = const Carrito().agregar(gaseosa);
      expect(carrito.cambiar(gaseosa, 0).vacio, isTrue);
      expect(carrito.cambiar(gaseosa, -1).cantidadDe(gaseosa.id), 1);
      expect(carrito.cambiar(gaseosa, Carrito.maximaCantidad + 1).cantidadDe(gaseosa.id), 1);
    });

    test('no pasa de 100 productos distintos, como la API', () {
      var carrito = const Carrito();
      for (var i = 0; i < 101; i++) {
        carrito = carrito.agregar(ArticuloEnVenta(id: 'p$i', nombre: 'P $i', precio: '1.00'));
      }
      expect(carrito.lineas, hasLength(Carrito.maximoDeLineas));
    });
  });
}
