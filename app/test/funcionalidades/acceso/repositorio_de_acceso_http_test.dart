import 'dart:convert';

import 'package:conta_app/funcionalidades/acceso/datos/repositorio_de_acceso_http.dart';
import 'package:conta_app/funcionalidades/acceso/dominio/acceso.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

void main() {
  test('entrar envía celular y código y lee la sesión', () async {
    late http.Request pedido;
    final repositorio = RepositorioDeAccesoHttp(
      'https://api.ejemplo',
      cliente: MockClient((p) async {
        pedido = p;
        return http.Response(
          jsonEncode({'token': 't' * 43, 'venceEn': '2026-12-23T15:00:00.000Z', 'usuario': {'celular': '+573001234567'}, 'nuevo': true}),
          201,
        );
      }),
    );
    final respuesta = await repositorio.entrar('3001234567', '123456');
    expect(pedido.url.toString(), 'https://api.ejemplo/acceso/sesiones');
    expect(jsonDecode(pedido.body), {'celular': '3001234567', 'codigo': '123456'});
    expect((respuesta as Exito<SesionGuardada>).valor.celular, '+573001234567');
  });

  test('un rechazo trae el código estable, el mensaje y los intentos que quedan', () async {
    final repositorio = RepositorioDeAccesoHttp(
      'https://api.ejemplo',
      cliente: MockClient((_) async => http.Response(
            jsonEncode({'codigo': 'acceso.codigo-incorrecto', 'mensaje': 'El código no coincide.', 'intentosRestantes': 2}),
            401,
          )),
    );
    final rechazo = await repositorio.entrar('3001234567', '000000') as Rechazo<SesionGuardada>;
    expect(rechazo.codigo, 'acceso.codigo-incorrecto');
    expect(rechazo.intentosRestantes, 2);
  });

  test('sin red responde sin-conexion, sin lanzar', () async {
    final repositorio = RepositorioDeAccesoHttp('https://api.ejemplo', cliente: MockClient((_) => throw Exception('sin red')));
    final rechazo = await repositorio.pedirCodigo('3001234567') as Rechazo<CodigoEnviado>;
    expect(rechazo.codigo, Rechazo.sinConexion);
  });
}
