import 'dart:convert';

import 'package:conta_app/funcionalidades/salud/datos/repositorio_salud_http.dart';
import 'package:conta_app/funcionalidades/salud/dominio/estado_api.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

void main() {
  test('sin URL no llama a la red', () async {
    final cliente = MockClient((_) async => throw StateError('no debía llamar'));
    expect(await RepositorioSaludHttp('', cliente: cliente).consultar(), isA<ApiSinConfigurar>());
  });

  test('lee la versión de /salud', () async {
    final cliente = MockClient((pedido) async {
      expect(pedido.url.path, '/salud');
      return http.Response(jsonEncode({'estado': 'ok', 'version': '0.1.0'}), 200);
    });
    final estado = await RepositorioSaludHttp('https://api.test', cliente: cliente).consultar();
    expect(estado, isA<ApiViva>().having((e) => e.version, 'version', '0.1.0'));
  });

  test('un error del servidor es sin respuesta', () async {
    final cliente = MockClient((_) async => http.Response('caído', 502));
    expect(await RepositorioSaludHttp('https://api.test', cliente: cliente).consultar(), isA<ApiSinRespuesta>());
  });
}
