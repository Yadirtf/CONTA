import 'dart:convert';

import 'package:conta_app/funcionalidades/productos/datos/repositorio_de_productos_http.dart';
import 'package:conta_app/funcionalidades/productos/dominio/productos.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

RepositorioDeProductosHttp _repositorio(Future<http.Response> Function(http.Request) responder) =>
    RepositorioDeProductosHttp('https://api.ejemplo', token: () => 'tok', cliente: MockClient(responder));

const _gaseosa = {
  'id': 'p1',
  'nombre': 'Gaseosa 400 ml',
  'codigo': '7702',
  'unidad': '94',
  'iva': {'tipo': 'gravado', 'tarifa': '19'},
  'precio': {'total': '10000.00', 'base': '8403.36', 'iva': '1596.64'},
};

void main() {
  test('busca con GET y el texto en la consulta; sin texto pide la lista', () async {
    final pedidos = <http.Request>[];
    final repositorio = _repositorio((p) async {
      pedidos.add(p);
      return http.Response(
        jsonEncode({
          'productos': [_gaseosa],
        }),
        200,
      );
    });
    final respuesta = await repositorio.buscar('e1', ' café & pan ');
    await repositorio.buscar('e1', '  ');
    expect(pedidos.map((p) => p.url.toString()), [
      'https://api.ejemplo/productos?buscar=caf%C3%A9+%26+pan',
      'https://api.ejemplo/productos',
    ]);
    expect(pedidos.first.headers['X-Empresa'], 'e1');
    final producto = (respuesta as Exito<List<Producto>>).valor.single;
    expect((producto.iva, producto.precio.base, producto.precio.iva), (IvaDelProducto.general, '8403.36', '1596.64'));
  });

  test('crear manda el precio como texto y el IVA como lo pide la API', () async {
    late http.Request pedido;
    await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode(_gaseosa), 201);
    }).crear(
      'e1',
      const ProductoNuevo(
        id: 'id-1',
        nombre: 'Arroz',
        precio: '18000',
        precioIncluyeIva: true,
        iva: IvaDelProducto.excluido,
      ),
    );
    expect(jsonDecode(pedido.body), {
      'id': 'id-1',
      'nombre': 'Arroz',
      'unidad': '94',
      'precio': '18000',
      'precioIncluyeIva': true,
      'tipoDeIva': 'excluido',
    });
  });

  test('un 403 trae el mensaje de la API; un IVA desconocido no se muestra', () async {
    final denegado =
        await _repositorio(
          (_) async => http.Response(jsonEncode({'codigo': 'permiso.denegado', 'mensaje': 'No tienes permiso'}), 403),
        ).crear(
          'e1',
          const ProductoNuevo(id: 'x', nombre: 'X', precio: '1', precioIncluyeIva: true, iva: IvaDelProducto.general),
        );
    expect(denegado, isA<Rechazo<Producto>>().having((r) => r.mensaje, 'mensaje', 'No tienes permiso'));
    final raro =
        await _repositorio(
          (_) async => http.Response(
            jsonEncode({
              ..._gaseosa,
              'iva': {'tipo': 'gravado', 'tarifa': '16'},
            }),
            200,
          ),
        ).crear(
          'e1',
          const ProductoNuevo(id: 'x', nombre: 'X', precio: '1', precioIncluyeIva: true, iva: IvaDelProducto.general),
        );
    expect(raro, isA<Rechazo<Producto>>());
  });
}
