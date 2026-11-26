import 'dart:convert';

import 'package:http/http.dart' as http;

import '../respuesta.dart';

/// Una petición a la API de CONTA con el token de la sesión y, si va dentro de un negocio, X-Empresa.
/// Traduce la respuesta a [Respuesta]: el valor leído, o el rechazo con el código estable de la API.
class ClienteDeApi {
  ClienteDeApi(this.urlApi, {required this.token, http.Client? cliente, this.limite = const Duration(seconds: 20)})
    : _cliente = cliente ?? http.Client();

  final String urlApi;

  /// Token de la sesión vigente. Llega desde la composición: las funcionalidades no conocen el acceso.
  final String? Function() token;

  /// 20 s: la API de pruebas puede estar despertando (Render gratis).
  final Duration limite;
  final http.Client _cliente;

  /// Código de la API cuando la sesión ya no sirve: hay que volver a entrar.
  static const sinSesion = 'acceso.sin-sesion';

  Future<Respuesta<T>> pedir<T>(
    String metodo,
    String ruta,
    T Function(Object? datos) leer, {
    String? empresaId,
    Object? cuerpo,
  }) async {
    if (urlApi.isEmpty) return const Rechazo(Rechazo.sinConexion, 'Esta versión no sabe a qué servidor conectarse.');
    final actual = token();
    if (actual == null) return const Rechazo(sinSesion, 'Inicia sesión otra vez.');
    try {
      final pedido = http.Request(metodo, Uri.parse(urlApi).resolve(ruta))
        ..headers['Authorization'] = 'Bearer $actual';
      if (empresaId != null) pedido.headers['X-Empresa'] = empresaId;
      if (cuerpo != null) {
        pedido.headers['Content-Type'] = 'application/json';
        pedido.body = jsonEncode(cuerpo);
      }
      final respuesta = await _enviar(pedido).timeout(limite);
      final datos = respuesta.body.isEmpty ? null : jsonDecode(respuesta.body);
      if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) return Exito(leer(datos));
      final error = datos is Map ? datos : const {};
      return Rechazo(
        error['codigo'] as String? ?? 'desconocido',
        error['mensaje'] as String? ?? 'Algo salió mal. Intenta de nuevo.',
      );
    } on Object {
      return const Rechazo(Rechazo.sinConexion, 'Sin conexión con el servidor. Revisa tus datos e intenta otra vez.');
    }
  }

  Future<http.Response> _enviar(http.BaseRequest pedido) async => http.Response.fromStream(await _cliente.send(pedido));
}
