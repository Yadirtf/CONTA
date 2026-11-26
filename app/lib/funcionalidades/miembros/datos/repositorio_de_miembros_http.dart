import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/miembros.dart';

/// Personas del negocio con la API de CONTA: GET, POST y DELETE /miembros, siempre con X-Empresa.
class RepositorioDeMiembrosHttp implements RepositorioDeMiembros {
  RepositorioDeMiembrosHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;

  @override
  Future<Respuesta<List<Miembro>>> listar(String empresaId) => _api.pedir(
    'GET',
    '/miembros',
    (d) => (d as List).map((f) => _miembro(f as Map)).whereType<Miembro>().toList(),
    empresaId: empresaId,
  );

  @override
  Future<Respuesta<Miembro>> invitar(String empresaId, String celular, Rol rol) => _api.pedir(
    'POST',
    '/miembros',
    (d) => _miembro(d as Map) ?? (throw const FormatException('Miembro con un rol desconocido')),
    empresaId: empresaId,
    cuerpo: {'celular': celular, 'rol': rol.codigo},
  );

  @override
  Future<Respuesta<void>> retirar(String empresaId, String usuarioId) =>
      _api.pedir('DELETE', '/miembros/${Uri.encodeComponent(usuarioId)}', (_) {}, empresaId: empresaId);

  /// null si el rol es desconocido: la persona no se muestra con un rol inventado.
  static Miembro? _miembro(Map<dynamic, dynamic> d) {
    final rol = Rol.de(d['rol']);
    if (rol == null) return null;
    return Miembro(
      usuarioId: d['usuarioId'] as String,
      celular: d['celular'] as String,
      rol: rol,
      invitado: d['estado'] == 'invitada',
    );
  }
}
