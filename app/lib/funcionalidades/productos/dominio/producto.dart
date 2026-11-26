// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// Cómo trata el IVA al producto (HU-05.02), con las palabras del modo simple. El tipo y la tarifa son los de
/// la API, que es quien decide cuánto IVA se cobra.
enum IvaDelProducto {
  general('gravado', '19', 'IVA 19 %', 'La mayoría de productos y servicios.'),
  reducido('gravado', '5', 'IVA 5 %', 'Algunos alimentos como el café, el chocolate y los embutidos.'),
  exento('exento', null, 'Exento (0 %)', 'Carne, pollo, pescado, leche y huevos: IVA de 0 %.'),
  excluido('excluido', null, 'Sin IVA (excluido)', 'Frutas, verduras, arroz y servicios de salud: no tienen IVA.');

  const IvaDelProducto(this.tipo, this.tarifa, this.nombre, this.ejemplos);

  /// Como lo escribe la API: gravado, exento o excluido.
  final String tipo;

  /// 19 o 5 si es gravado; null en los demás.
  final String? tarifa;

  final String nombre;
  final String ejemplos;

  /// Si cobra IVA encima de la base. Exentos y excluidos, no.
  bool get cobraIva => tipo == 'gravado';

  static IvaDelProducto? de(Object? tipo, Object? tarifa) =>
      values.where((i) => i.tipo == tipo && (i.tipo != 'gravado' || i.tarifa == tarifa)).firstOrNull;
}

/// Unidades con las que se vende (UN/ECE), las mismas que acepta la API.
enum UnidadDeMedida {
  unidad('94', 'Unidad'),
  kilogramo('KGM', 'Kilo'),
  gramo('GRM', 'Gramo'),
  libra('LBR', 'Libra'),
  litro('LTR', 'Litro'),
  mililitro('MLT', 'Mililitro'),
  metro('MTR', 'Metro'),
  hora('HUR', 'Hora');

  const UnidadDeMedida(this.codigo, this.nombre);

  final String codigo;
  final String nombre;

  static UnidadDeMedida? de(Object? codigo) => values.where((u) => u.codigo == codigo).firstOrNull;
}

/// Un precio ya separado por la API: lo que se cobra, la base y el IVA, en texto con punto decimal («2100.84»).
/// La app no los calcula ni los convierte a double: solo los muestra.
final class PrecioSeparado {
  const PrecioSeparado({required this.total, required this.base, required this.iva});

  final String total;
  final String base;
  final String iva;

  @override
  bool operator ==(Object other) =>
      other is PrecioSeparado && other.total == total && other.base == base && other.iva == iva;

  @override
  int get hashCode => Object.hash(total, base, iva);
}

/// Un producto del catálogo del negocio (HU-05.02).
final class Producto {
  const Producto({
    required this.id,
    required this.nombre,
    required this.codigo,
    required this.unidad,
    required this.iva,
    required this.precio,
  });

  final String id;
  final String nombre;
  final String? codigo;
  final UnidadDeMedida unidad;
  final IvaDelProducto iva;

  /// El de una unidad, con el IVA incluido.
  final PrecioSeparado precio;

  @override
  bool operator ==(Object other) =>
      other is Producto &&
      other.id == id &&
      other.nombre == nombre &&
      other.codigo == codigo &&
      other.unidad == unidad &&
      other.iva == iva &&
      other.precio == precio;

  @override
  int get hashCode => Object.hash(id, nombre, codigo, unidad, iva, precio);
}

/// Lo que se manda para crear un producto. El id lo pone la app: repetir el envío no crea dos.
final class ProductoNuevo {
  const ProductoNuevo({
    required this.id,
    required this.nombre,
    required this.precio,
    required this.precioIncluyeIva,
    required this.iva,
    this.unidad = UnidadDeMedida.unidad,
    this.codigo,
  });

  final String id;
  final String nombre;

  /// En pesos con punto decimal, como lo pide la API («2500» o «2500.50»).
  final String precio;
  final bool precioIncluyeIva;
  final IvaDelProducto iva;
  final UnidadDeMedida unidad;
  final String? codigo;
}
