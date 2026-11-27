// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import 'centavos.dart';

/// Lo que la pantalla de vender necesita de un producto: su id, su nombre y lo que se cobra por una unidad, con
/// el IVA incluido, como lo manda la API («2500.00»). El precio solo se muestra: la API cobra el del catálogo.
final class ArticuloEnVenta {
  const ArticuloEnVenta({required this.id, required this.nombre, required this.precio});

  final String id;
  final String nombre;
  final String precio;
}

final class LineaDelCarrito {
  const LineaDelCarrito(this.articulo, this.cantidad);

  final ArticuloEnVenta articulo;
  final int cantidad;

  /// Lo que se ve en la pantalla. El total que vale es el que responde la API.
  BigInt get centavos => centavosDe(articulo.precio) * BigInt.from(cantidad);
}

/// Lo que se va a cobrar, en el orden en que se tocó. Inmutable: cada cambio devuelve otro carrito.
final class Carrito {
  const Carrito([this.lineas = const []]);

  /// Igual que la API: hasta 100 productos distintos y hasta 1.000.000 de unidades de cada uno.
  static const maximoDeLineas = 100;
  static const maximaCantidad = 1000000;

  final List<LineaDelCarrito> lineas;

  bool get vacio => lineas.isEmpty;
  int get unidades => lineas.fold(0, (suma, l) => suma + l.cantidad);
  String get total => montoDe(lineas.fold(BigInt.zero, (suma, l) => suma + l.centavos));

  int cantidadDe(String articuloId) => lineas.where((l) => l.articulo.id == articuloId).firstOrNull?.cantidad ?? 0;

  /// Un toque suma una unidad; si el producto no estaba, entra al final.
  Carrito agregar(ArticuloEnVenta articulo) {
    final actual = cantidadDe(articulo.id);
    if (actual == 0 && lineas.length >= maximoDeLineas) return this;
    return cambiar(articulo, actual + 1);
  }

  /// Cero lo saca del carrito.
  Carrito cambiar(ArticuloEnVenta articulo, int cantidad) {
    if (cantidad < 0 || cantidad > maximaCantidad) return this;
    final existe = lineas.any((l) => l.articulo.id == articulo.id);
    final nuevas = [
      for (final l in lineas)
        if (l.articulo.id != articulo.id) l else if (cantidad > 0) LineaDelCarrito(l.articulo, cantidad),
      if (!existe && cantidad > 0) LineaDelCarrito(articulo, cantidad),
    ];
    return Carrito(List.unmodifiable(nuevas));
  }
}
