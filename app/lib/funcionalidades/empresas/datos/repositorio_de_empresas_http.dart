import 'dart:convert';

import 'package:http/http.dart' as http;

import '../dominio/empresas.dart';

/// Empresas con la API de CONTA (GET y POST /empresas, GET /empresas/:id con X-Empresa).
class RepositorioDeEmpresasHttp implements RepositorioDeEmpresas {
  RepositorioDeEmpresasHttp(
    this.urlApi, {
    required this.token,
    http.Client? cliente,
    this.limite = const Duration(seconds: 20),
  }) : _cliente = cliente ?? http.Client();

  final String urlApi;

  /// Token de la sesión vigente. Llega desde la composición: empresas no conoce el acceso.
  final String? Function() token;

  /// 20 s: la API de pruebas puede estar despertando (Render gratis).
  final Duration limite;
  final http.Client _cliente;

  @override
  Future<Respuesta<List<Empresa>>> misEmpresas() =>
      _pedir((u, e) => _cliente.get(u, headers: e), '', (d) => (d as List).map((f) => _empresa(f as Map)).toList());

  @override
  Future<Respuesta<Empresa>> crear(String razonSocial) => _pedir(
    (u, e) => _cliente.post(
      u,
      headers: {...e, 'Content-Type': 'application/json'},
      body: jsonEncode({'razonSocial': razonSocial}),
    ),
    '',
    (d) => _empresa(d as Map),
  );

  @override
  Future<Respuesta<Empresa>> datosDe(String empresaId) => _pedir(
    (u, e) => _cliente.get(u, headers: {...e, 'X-Empresa': empresaId}),
    '/${Uri.encodeComponent(empresaId)}',
    (d) => _empresa(d as Map),
  );

  static Empresa _empresa(Map<dynamic, dynamic> d) =>
      Empresa(id: d['id'] as String, razonSocial: d['razonSocial'] as String);

  Future<Respuesta<T>> _pedir<T>(
    Future<http.Response> Function(Uri url, Map<String, String> encabezados) enviar,
    String ruta,
    T Function(Object? datos) leer,
  ) async {
    if (urlApi.isEmpty) return const Rechazo(Rechazo.sinConexion, 'Esta versión no sabe a qué servidor conectarse.');
    final actual = token();
    if (actual == null) return const Rechazo(sinSesion, 'Inicia sesión otra vez.');
    try {
      final url = Uri.parse(urlApi).resolve('/empresas$ruta');
      final respuesta = await enviar(url, {'Authorization': 'Bearer $actual'}).timeout(limite);
      final datos = jsonDecode(respuesta.body);
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
}
