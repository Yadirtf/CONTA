import 'dart:convert';

import 'package:http/http.dart' as http;

import '../dominio/acceso.dart';

/// Acceso con la API de CONTA (POST /acceso/codigos, POST /acceso/sesiones, DELETE /acceso/sesiones/actual).
class RepositorioDeAccesoHttp implements RepositorioDeAcceso {
  RepositorioDeAccesoHttp(this.urlApi, {http.Client? cliente, this.limite = const Duration(seconds: 20)})
      : _cliente = cliente ?? http.Client();

  final String urlApi;

  /// 20 s: la API de pruebas puede estar despertando (Render gratis).
  final Duration limite;
  final http.Client _cliente;

  static const _json = {'Content-Type': 'application/json'};

  @override
  Future<Respuesta<CodigoEnviado>> pedirCodigo(String celular) => _enviar(
        'codigos',
        {'celular': celular},
        (c) => CodigoEnviado(
          venceEn: DateTime.parse(c['venceEn'] as String),
          otroCodigoDesde: DateTime.parse(c['otroCodigoDesde'] as String),
        ),
      );

  @override
  Future<Respuesta<SesionGuardada>> entrar(String celular, String codigo) => _enviar(
        'sesiones',
        {'celular': celular, 'codigo': codigo},
        (c) => SesionGuardada(
          token: c['token'] as String,
          venceEn: DateTime.parse(c['venceEn'] as String),
          celular: (c['usuario'] as Map)['celular'] as String,
        ),
      );

  @override
  Future<void> salir(String token) async {
    try {
      await _cliente
          .delete(_url('sesiones/actual'), headers: {'Authorization': 'Bearer $token'}).timeout(limite);
    } on Object {
      // Sin señal la sesión se borra igual del dispositivo; en el servidor vence sola.
    }
  }

  Uri _url(String ruta) => Uri.parse(urlApi).resolve('/acceso/$ruta');

  Future<Respuesta<T>> _enviar<T>(String ruta, Map<String, String> cuerpo, T Function(Map<String, dynamic>) leer) async {
    if (urlApi.isEmpty) return const Rechazo(Rechazo.sinConexion, 'Esta versión no sabe a qué servidor conectarse.');
    try {
      final respuesta = await _cliente.post(_url(ruta), headers: _json, body: jsonEncode(cuerpo)).timeout(limite);
      final datos = jsonDecode(respuesta.body) as Map<String, dynamic>;
      if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) return Exito(leer(datos));
      return Rechazo(
        datos['codigo'] as String? ?? 'desconocido',
        datos['mensaje'] as String? ?? 'Algo salió mal. Intenta de nuevo.',
        reintentarDesde: DateTime.tryParse(datos['reintentarDesde'] as String? ?? ''),
        intentosRestantes: datos['intentosRestantes'] as int?,
      );
    } on Object {
      return const Rechazo(Rechazo.sinConexion, 'Sin conexión con el servidor. Revisa tus datos e intenta otra vez.');
    }
  }
}
