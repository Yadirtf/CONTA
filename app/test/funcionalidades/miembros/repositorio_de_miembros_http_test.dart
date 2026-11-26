import 'dart:convert';

import 'package:conta_app/funcionalidades/miembros/datos/repositorio_de_miembros_http.dart';
import 'package:conta_app/funcionalidades/miembros/dominio/miembros.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

RepositorioDeMiembrosHttp _repositorio(Future<http.Response> Function(http.Request) responder) =>
    RepositorioDeMiembrosHttp('https://api.ejemplo', token: () => 'tok', cliente: MockClient(responder));

void main() {
  test('lista dentro del negocio, con X-Empresa, y descarta roles desconocidos', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response(
        jsonEncode([
          {'usuarioId': 'u1', 'celular': '+57 300 *** 0001', 'rol': 'cajero', 'modo': 'simple', 'estado': 'invitada'},
          {'usuarioId': 'u2', 'celular': '+57 300 *** 0002', 'rol': 'soporte', 'modo': 'simple', 'estado': 'activa'},
        ]),
        200,
      );
    }).listar('e1');
    expect(pedido.url.toString(), 'https://api.ejemplo/miembros');
    expect(pedido.headers['X-Empresa'], 'e1');
    expect(pedido.headers['Authorization'], 'Bearer tok');
    expect((respuesta as Exito<List<Miembro>>).valor, [
      const Miembro(usuarioId: 'u1', celular: '+57 300 *** 0001', rol: Rol.cajero, invitado: true),
    ]);
  });

  test('invitar manda celular y rol; un 403 trae «No tienes permiso»', () async {
    late http.Request pedido;
    final rechazo = await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode({'codigo': 'permiso.denegado', 'mensaje': 'No tienes permiso'}), 403);
    }).invitar('e1', '3001234567', Rol.cajero);
    expect(pedido.method, 'POST');
    expect(jsonDecode(pedido.body), {'celular': '3001234567', 'rol': 'cajero'});
    expect(rechazo, isA<Rechazo<Miembro>>().having((r) => r.mensaje, 'mensaje', 'No tienes permiso'));
  });

  test('retirar es DELETE /miembros/:id y acepta la respuesta vacía', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response('', 204);
    }).retirar('e1', 'u1');
    expect((pedido.method, pedido.url.path), ('DELETE', '/miembros/u1'));
    expect(respuesta, isA<Exito<void>>());
  });
}
