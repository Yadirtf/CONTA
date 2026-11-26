import 'dart:convert';

import 'package:conta_app/funcionalidades/verificacion/datos/repositorio_de_verificacion_http.dart';
import 'package:conta_app/funcionalidades/verificacion/dominio/verificacion.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

RepositorioDeVerificacionHttp _repositorio(Future<http.Response> Function(http.Request) responder) =>
    RepositorioDeVerificacionHttp('https://api.ejemplo', token: () => 'tok', cliente: MockClient(responder));

void main() {
  test('lee el estado de la verificación con la sesión', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response(
        jsonEncode({'inscrito': true, 'verificadaHasta': null, 'codigosDeRecuperacionRestantes': 7}),
        200,
      );
    }).estado();
    expect(pedido.url.toString(), 'https://api.ejemplo/acceso/segundo-factor');
    expect(pedido.headers['Authorization'], 'Bearer tok');
    final estado = (respuesta as Exito<EstadoDeVerificacion>).valor;
    expect([estado.appConfigurada, estado.sesionVerificada, estado.codigosRestantes], [true, false, 7]);
  });

  test('configura la app y confirma con el primer código', () async {
    final pedidos = <http.Request>[];
    final repositorio = _repositorio((p) async {
      pedidos.add(p);
      return p.url.path.endsWith('confirmacion')
          ? http.Response(jsonEncode({'codigosDeRecuperacion': ['ABCDE-FGHJK'], 'verificadaHasta': '2026-11-26T20:00:00Z'}), 201)
          : http.Response(jsonEncode({'secreto': 'JBSWY3DP', 'uri': 'otpauth://x', 'venceEn': '2026-11-26T08:00:00Z'}), 201);
    });
    final app = (await repositorio.configurar() as Exito<AppPorConfigurar>).valor;
    expect([app.clave, app.enlace], ['JBSWY3DP', 'otpauth://x']);
    final codigos = (await repositorio.confirmar('123456') as Exito<List<String>>).valor;
    expect(codigos, ['ABCDE-FGHJK']);
    expect(pedidos.map((p) => '${p.method} ${p.url.path}'), [
      'POST /acceso/segundo-factor/inscripcion',
      'POST /acceso/segundo-factor/inscripcion/confirmacion',
    ]);
    expect(jsonDecode(pedidos.last.body), {'codigo': '123456'});
  });

  test('un código incorrecto llega como rechazo con el mensaje de la API', () async {
    final respuesta = await _repositorio(
      (_) async => http.Response(
        jsonEncode({'codigo': 'segundo-factor.codigo-incorrecto', 'mensaje': 'El código no coincide.', 'intentosRestantes': 4}),
        422,
      ),
    ).verificar('000000');
    expect((respuesta as Rechazo).codigo, 'segundo-factor.codigo-incorrecto');
  });
}
