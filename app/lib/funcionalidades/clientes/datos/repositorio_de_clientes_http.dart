import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/clientes.dart';
import 'comprador_de_json.dart';

/// Compradores con la API de CONTA, siempre con X-Empresa. La búsqueda va en el cuerpo de un POST para que
/// el documento de la persona no quede en direcciones ni registros.
class RepositorioDeClientesHttp implements RepositorioDeClientes {
  RepositorioDeClientesHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;

  @override
  Future<Respuesta<ResultadoDeBusqueda>> buscar(String empresaId, String documento) =>
      _api.pedir('POST', '/clientes/busqueda', busquedaDeJson, empresaId: empresaId, cuerpo: {'documento': documento});

  @override
  Future<Respuesta<Comprador>> consumidorFinal(String empresaId) =>
      _api.pedir('GET', '/clientes/consumidor-final', compradorDeJson, empresaId: empresaId);

  @override
  Future<Respuesta<Comprador>> crear(String empresaId, CompradorNuevo nuevo) =>
      _api.pedir('POST', '/clientes', compradorDeJson, empresaId: empresaId, cuerpo: jsonDeCompradorNuevo(nuevo));
}
