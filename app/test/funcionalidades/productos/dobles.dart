import 'package:conta_app/funcionalidades/productos/dominio/productos.dart';

/// API de productos falsa: guarda lo que se pidió y responde como la real (búsqueda por nombre, crear
/// idempotente por id). El precio separado es fijo: la app nunca lo calcula.
class RepositorioDeProductosFalso implements RepositorioDeProductos {
  RepositorioDeProductosFalso([List<Producto>? productos]) : productos = [...?productos];

  final List<Producto> productos;
  final busquedas = <String>[];
  final creados = <ProductoNuevo>[];

  /// Si no es null, la próxima creación responde este rechazo.
  Rechazo<Producto>? rechazoAlCrear;

  @override
  Future<Respuesta<List<Producto>>> buscar(String empresaId, String texto) async {
    busquedas.add(texto);
    final buscado = texto.trim().toLowerCase();
    return Exito(productos.where((p) => p.nombre.toLowerCase().contains(buscado)).toList());
  }

  @override
  Future<Respuesta<Producto>> crear(String empresaId, ProductoNuevo nuevo) async {
    creados.add(nuevo);
    if (rechazoAlCrear case final rechazo?) {
      rechazoAlCrear = null;
      return rechazo;
    }
    final existente = productos.where((p) => p.id == nuevo.id).firstOrNull;
    if (existente != null) return Exito(existente);
    final producto = Producto(
      id: nuevo.id,
      nombre: nuevo.nombre,
      codigo: nuevo.codigo,
      unidad: nuevo.unidad,
      iva: nuevo.iva,
      precio: PrecioSeparado(total: '${nuevo.precio}.00', base: '8403.36', iva: '1596.64'),
    );
    productos.add(producto);
    return Exito(producto);
  }
}

const gaseosa = Producto(
  id: 'p-gaseosa',
  nombre: 'Gaseosa 400 ml',
  codigo: '7702004003508',
  unidad: UnidadDeMedida.unidad,
  iva: IvaDelProducto.general,
  precio: PrecioSeparado(total: '10000.00', base: '8403.36', iva: '1596.64'),
);

const arroz = Producto(
  id: 'p-arroz',
  nombre: 'Arroz x 5 kg',
  codigo: null,
  unidad: UnidadDeMedida.unidad,
  iva: IvaDelProducto.excluido,
  precio: PrecioSeparado(total: '18000.00', base: '18000.00', iva: '0.00'),
);
