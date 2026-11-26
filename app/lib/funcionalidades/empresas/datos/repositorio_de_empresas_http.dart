import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/empresas.dart';
import 'empresa_de_json.dart';

/// Empresas con la API de CONTA: GET y POST /empresas, GET /empresas/:id con X-Empresa y la respuesta a una
/// invitación en POST /empresas/:id/invitacion/aceptar|rechazar.
class RepositorioDeEmpresasHttp implements RepositorioDeEmpresas {
  RepositorioDeEmpresasHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;

  @override
  Future<Respuesta<List<Empresa>>> misEmpresas() =>
      _api.pedir('GET', '/empresas', (d) => (d as List).map((f) => empresaDeJson(f as Map)).toList());

  @override
  Future<Respuesta<Empresa>> crear(String razonSocial) =>
      _api.pedir('POST', '/empresas', (d) => empresaDeJson(d as Map), cuerpo: {'razonSocial': razonSocial});

  @override
  Future<Respuesta<Empresa>> datosDe(String empresaId) =>
      _api.pedir('GET', '/empresas/${Uri.encodeComponent(empresaId)}', (d) => empresaDeJson(d as Map), empresaId: empresaId);

  @override
  Future<Respuesta<void>> responderInvitacion(String empresaId, {required bool aceptar}) => _api.pedir(
    'POST',
    '/empresas/${Uri.encodeComponent(empresaId)}/invitacion/${aceptar ? 'aceptar' : 'rechazar'}',
    (_) {},
  );
}
