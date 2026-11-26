import '../dominio/productos.dart';

/// Lee un producto de la API. Un IVA o una unidad desconocidos son un error de formato: nunca se muestra un
/// producto con un impuesto inventado.
Producto productoDeJson(Object? datos) {
  final d = datos as Map;
  final iva = d['iva'] as Map;
  final precio = d['precio'] as Map;
  return Producto(
    id: d['id'] as String,
    nombre: d['nombre'] as String,
    codigo: d['codigo'] as String?,
    unidad: UnidadDeMedida.de(d['unidad']) ?? (throw const FormatException('Unidad desconocida')),
    iva: IvaDelProducto.de(iva['tipo'], iva['tarifa']) ?? (throw const FormatException('IVA desconocido')),
    precio: PrecioSeparado(
      total: precio['total'] as String,
      base: precio['base'] as String,
      iva: precio['iva'] as String,
    ),
  );
}

List<Producto> listaDeJson(Object? datos) => ((datos as Map)['productos'] as List).map(productoDeJson).toList();

Map<String, Object?> jsonDeProductoNuevo(ProductoNuevo nuevo) => {
  'id': nuevo.id,
  'nombre': nuevo.nombre,
  if (nuevo.codigo != null) 'codigo': nuevo.codigo,
  'unidad': nuevo.unidad.codigo,
  'precio': nuevo.precio,
  'precioIncluyeIva': nuevo.precioIncluyeIva,
  'tipoDeIva': nuevo.iva.tipo,
  if (nuevo.iva.tarifa != null) 'tarifaIva': nuevo.iva.tarifa,
};
