import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/productos.dart';
import 'producto_de_json.dart';

/// Productos con la API de CONTA, siempre con X-Empresa. Un producto no es un dato personal: buscar va en la URL.
class RepositorioDeProductosHttp implements RepositorioDeProductos {
  RepositorioDeProductosHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;

  @override
  Future<Respuesta<List<Producto>>> buscar(String empresaId, String texto) {
    final buscado = texto.trim();
    final consulta = buscado.isEmpty ? '' : '?buscar=${Uri.encodeQueryComponent(buscado)}';
    return _api.pedir('GET', '/productos$consulta', listaDeJson, empresaId: empresaId);
  }

  @override
  Future<Respuesta<Producto>> crear(String empresaId, ProductoNuevo nuevo) =>
      _api.pedir('POST', '/productos', productoDeJson, empresaId: empresaId, cuerpo: jsonDeProductoNuevo(nuevo));
}
