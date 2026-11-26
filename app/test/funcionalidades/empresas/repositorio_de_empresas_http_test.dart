import 'dart:convert';

import 'package:conta_app/funcionalidades/empresas/datos/repositorio_de_empresas_http.dart';
import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

const _token = 'tttttttttttttttttttttttttttttttttttttttttttt';

RepositorioDeEmpresasHttp _repositorio(
  Future<http.Response> Function(http.Request) responder, {
  String? token = _token,
}) => RepositorioDeEmpresasHttp('https://api.ejemplo', token: () => token, cliente: MockClient(responder));

void main() {
  test('lista mis empresas con el token de la sesión', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response(
        jsonEncode([
          {'id': 'e1', 'razonSocial': 'Tienda'},
        ]),
        200,
      );
    }).misEmpresas();
    expect(pedido.url.toString(), 'https://api.ejemplo/empresas');
    expect(pedido.headers['Authorization'], 'Bearer $_token');
    expect((respuesta as Exito<List<Empresa>>).valor, [const Empresa(id: 'e1', razonSocial: 'Tienda')]);
  });

  test('los datos de una empresa se piden dentro de ella, con X-Empresa', () async {
    late http.Request pedido;
    await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode({'id': 'e1', 'razonSocial': 'Tienda'}), 200);
    }).datosDe('e1');
    expect(pedido.url.toString(), 'https://api.ejemplo/empresas/e1');
    expect(pedido.headers['X-Empresa'], 'e1');
  });

  test('crear envía la razón social', () async {
    late http.Request pedido;
    await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode({'id': 'e2', 'razonSocial': 'Nueva'}), 201);
    }).crear('Nueva');
    expect(pedido.method, 'POST');
    expect(jsonDecode(pedido.body), {'razonSocial': 'Nueva'});
  });

  test('un rechazo trae el código estable; sin sesión ni siquiera llama', () async {
    final ajena = await _repositorio(
      (_) async =>
          http.Response(jsonEncode({'codigo': 'empresa.no-encontrada', 'mensaje': 'No encontramos esa empresa'}), 404),
    ).datosDe('otra') as Rechazo<Empresa>;
    expect(ajena.codigo, 'empresa.no-encontrada');

    var llamadas = 0;
    final sinToken =
        await _repositorio((_) async {
              llamadas++;
              return http.Response('[]', 200);
            }, token: null).misEmpresas()
            as Rechazo<List<Empresa>>;
    expect((sinToken.codigo, llamadas), (sinSesion, 0));
  });

  test('sin red responde sin-conexion, sin lanzar', () async {
    final rechazo = await _repositorio((_) => throw Exception('sin red')).misEmpresas() as Rechazo<List<Empresa>>;
    expect(rechazo.codigo, Rechazo.sinConexion);
  });
}
