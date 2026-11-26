import 'dart:convert';

import 'package:conta_app/funcionalidades/empresas/datos/repositorio_de_empresas_http.dart';
import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

RepositorioDeEmpresasHttp _repositorio(Future<http.Response> Function(http.Request) responder) =>
    RepositorioDeEmpresasHttp('https://api.ejemplo', token: () => 'tok', cliente: MockClient(responder));

void main() {
  // HU-04.03: el modo y los permisos vienen de la API con la membresía; la app no los inventa.
  test('lee rol, modo, estado y permisos de cada empresa', () async {
    final respuesta = await _repositorio(
      (_) async => http.Response(
        jsonEncode([
          {
            'id': 'e1',
            'razonSocial': 'Tienda',
            'rol': 'cajero',
            'modo': 'simple',
            'estado': 'invitada',
            'permisos': ['ver-empresa', 'vender'],
          },
          {'id': 'e2', 'razonSocial': 'Sin membresía'},
          {'id': 'e3', 'razonSocial': 'Rol raro', 'rol': 'soporte', 'modo': 'simple', 'estado': 'activa', 'permisos': []},
        ]),
        200,
      ),
    ).misEmpresas();
    final [tienda, sinMembresia, rara] = (respuesta as Exito<List<Empresa>>).valor;
    expect(
      tienda.membresia,
      const Membresia(rol: Rol.cajero, modo: Modo.simple, invitada: true, permisos: {'ver-empresa', 'vender'}),
    );
    expect(tienda.invitada, isTrue);
    expect(sinMembresia.membresia, isNull);
    expect(rara.membresia, isNull);
  });

  // HU-04.04: la API dice si el negocio exige la verificación en dos pasos.
  test('lee si la membresía exige el segundo paso', () async {
    final respuesta = await _repositorio(
      (_) async => http.Response(
        jsonEncode([
          {
            'id': 'e1',
            'razonSocial': 'Cliente del contador',
            'rol': 'contador',
            'modo': 'contador',
            'estado': 'activa',
            'permisos': ['ver-empresa'],
            'exigeSegundoFactor': true,
          },
        ]),
        200,
      ),
    ).misEmpresas();
    expect((respuesta as Exito<List<Empresa>>).valor.single.membresia?.exigeSegundoPaso, isTrue);
  });

  test('aceptar y rechazar una invitación van a su ruta, sin X-Empresa', () async {
    final pedidos = <http.Request>[];
    final repositorio = _repositorio((p) async {
      pedidos.add(p);
      return http.Response('', 204);
    });
    expect(await repositorio.responderInvitacion('e1', aceptar: true), isA<Exito<void>>());
    await repositorio.responderInvitacion('e1', aceptar: false);
    expect(pedidos.map((p) => '${p.method} ${p.url.path}'), ['POST /empresas/e1/invitacion/aceptar', 'POST /empresas/e1/invitacion/rechazar']);
    expect(pedidos.first.headers.containsKey('X-Empresa'), isFalse);
  });
}
