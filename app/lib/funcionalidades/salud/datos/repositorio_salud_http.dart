import 'dart:convert';

import 'package:http/http.dart' as http;

import '../dominio/estado_api.dart';

class RepositorioSaludHttp implements RepositorioSalud {
  RepositorioSaludHttp(this.urlApi, {http.Client? cliente, this.limite = const Duration(seconds: 8)})
      : _cliente = cliente ?? http.Client();

  final String urlApi;
  final Duration limite;
  final http.Client _cliente;

  @override
  Future<EstadoApi> consultar() async {
    if (urlApi.isEmpty) return const ApiSinConfigurar();
    try {
      final respuesta = await _cliente.get(Uri.parse(urlApi).resolve('/salud')).timeout(limite);
      if (respuesta.statusCode != 200) return const ApiSinRespuesta();
      final cuerpo = jsonDecode(respuesta.body);
      if (cuerpo is Map && cuerpo['estado'] == 'ok' && cuerpo['version'] is String) {
        return ApiViva(cuerpo['version'] as String);
      }
      return const ApiSinRespuesta();
    } on Object {
      return const ApiSinRespuesta();
    }
  }
}
