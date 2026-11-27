import 'dart:convert';
import 'dart:typed_data';

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

  /// Código cuando la API respondió algo que no es lo pedido (por ejemplo, un archivo que no es PDF).
  static const respuestaInvalida = 'respuesta-invalida';

  static const _sinConexion = Rechazo<Never>(
    Rechazo.sinConexion,
    'Sin conexión con el servidor. Revisa tus datos e intenta otra vez.',
  );

  Future<Respuesta<T>> pedir<T>(
    String metodo,
    String ruta,
    T Function(Object? datos) leer, {
    String? empresaId,
    Object? cuerpo,
  }) => _con(metodo, ruta, empresaId, cuerpo, (respuesta) {
    final datos = respuesta.body.isEmpty ? null : jsonDecode(respuesta.body);
    return Exito(leer(datos));
  });

  /// Un PDF que solo se entrega con sesión (HU-06.08). Se revisa que sea un PDF y que no pase de [maximo] bytes:
  /// la app nunca comparte otra cosa con el nombre de una factura.
  Future<Respuesta<Uint8List>> descargarPdf(String ruta, {String? empresaId, int maximo = 5 * 1024 * 1024}) =>
      _con('GET', ruta, empresaId, null, (respuesta) {
        final bytes = respuesta.bodyBytes;
        final tipo = respuesta.headers['content-type'] ?? '';
        if (!tipo.startsWith('application/pdf') || bytes.length > maximo || !_empiezaComoPdf(bytes)) {
          return const Rechazo(respuestaInvalida, 'No pudimos leer la factura. Intenta otra vez.');
        }
        return Exito(bytes);
      });

  Future<Respuesta<T>> _con<T>(
    String metodo,
    String ruta,
    String? empresaId,
    Object? cuerpo,
    Respuesta<T> Function(http.Response respuesta) leerExito,
  ) async {
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
      if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) return leerExito(respuesta);
      return _rechazoDe(respuesta);
    } on Object {
      return _sinConexion;
    }
  }

  static Rechazo<T> _rechazoDe<T>(http.Response respuesta) {
    final datos = respuesta.body.isEmpty ? null : jsonDecode(respuesta.body);
    final error = datos is Map ? datos : const {};
    return Rechazo(
      error['codigo'] as String? ?? 'desconocido',
      error['mensaje'] as String? ?? 'Algo salió mal. Intenta de nuevo.',
    );
  }

  /// «%PDF-» al comienzo.
  static bool _empiezaComoPdf(Uint8List b) =>
      b.length > 5 && b[0] == 0x25 && b[1] == 0x50 && b[2] == 0x44 && b[3] == 0x46 && b[4] == 0x2d;

  Future<http.Response> _enviar(http.BaseRequest pedido) async => http.Response.fromStream(await _cliente.send(pedido));
}
