import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/ventas.dart';
import 'venta_de_json.dart';

/// Ventas con la API de CONTA, siempre con X-Empresa.
class RepositorioDeVentasHttp implements RepositorioDeVentas {
  RepositorioDeVentasHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;

  @override
  Future<Respuesta<VentaEmitida>> registrar(String empresaId, PedidoDeVenta pedido) =>
      _api.pedir('POST', '/ventas', ventaDeJson, empresaId: empresaId, cuerpo: jsonDePedido(pedido));

  @override
  Future<Respuesta<VentaEmitida>> consultar(String empresaId, String ventaId) =>
      _api.pedir('GET', '/ventas/${Uri.encodeComponent(ventaId)}', ventaDeJson, empresaId: empresaId);
}
