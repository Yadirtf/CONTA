import 'dart:convert';

import 'package:conta_app/funcionalidades/clientes/datos/repositorio_de_clientes_http.dart';
import 'package:conta_app/funcionalidades/clientes/dominio/clientes.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

RepositorioDeClientesHttp _repositorio(Future<http.Response> Function(http.Request) responder) =>
    RepositorioDeClientesHttp('https://api.ejemplo', token: () => 'tok', cliente: MockClient(responder));

const _ferreteria = {
  'id': 'c1',
  'esConsumidorFinal': false,
  'tipoDocumento': '31',
  'numero': '800197268',
  'digitoVerificacion': 4,
  'nombre': 'Ferretería El Tornillo',
  'tipoDePersona': 'juridica',
  'responsabilidadesFiscales': ['O-13'],
  'responsableDeIva': true,
  'correo': null,
  'direccion': null,
};

void main() {
  test('busca con un POST: el documento va en el cuerpo, no en la dirección', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response(
        jsonEncode({
          'nit': {'numero': '800197268', 'digitoVerificacion': 4},
          'clientes': [_ferreteria],
        }),
        200,
      );
    }).buscar('e1', '800197268');
    expect((pedido.method, pedido.url.toString()), ('POST', 'https://api.ejemplo/clientes/busqueda'));
    expect(pedido.url.query, isEmpty);
    expect(jsonDecode(pedido.body), {'documento': '800197268'});
    expect(pedido.headers['X-Empresa'], 'e1');
    final resultado = (respuesta as Exito<ResultadoDeBusqueda>).valor;
    expect(resultado.nit.toString(), '800197268-4');
    expect(resultado.compradores.single.documento, 'NIT 800197268-4');
  });

  test('el consumidor final llega sin id', () async {
    final respuesta = await _repositorio(
      (_) async => http.Response(
        jsonEncode({..._ferreteria, 'id': null, 'esConsumidorFinal': true, 'tipoDocumento': '13', 'numero': '222222222222', 'digitoVerificacion': null, 'tipoDePersona': 'natural'}),
        200,
      ),
    ).consumidorFinal('e1');
    final comprador = (respuesta as Exito<Comprador>).valor;
    expect((comprador.id, comprador.esConsumidorFinal, comprador.documento), (null, true, 'Cédula 222222222222'));
  });

  test('crear manda el id de la app y solo los campos escritos; un 400 trae el mensaje de la API', () async {
    late http.Request pedido;
    final rechazo = await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode({'codigo': 'nit.digito-invalido', 'mensaje': 'El dígito no corresponde'}), 400);
    }).crear(
      'e1',
      const CompradorNuevo(id: 'id-1', tipoDeDocumento: TipoDeDocumento.cedula, numero: '1020', nombre: 'Rosa', tipoDePersona: TipoDePersona.natural),
    );
    expect(jsonDecode(pedido.body), {
      'id': 'id-1',
      'tipoDocumento': '13',
      'numero': '1020',
      'nombre': 'Rosa',
      'tipoDePersona': 'natural',
      'responsableDeIva': false,
      'responsabilidadesFiscales': <String>[],
    });
    expect(rechazo, isA<Rechazo<Comprador>>().having((r) => r.codigo, 'codigo', 'nit.digito-invalido'));
  });

  test('un tipo de documento desconocido no se muestra como si fuera otro', () async {
    final respuesta = await _repositorio(
      (_) async => http.Response(jsonEncode({'nit': null, 'clientes': [{..._ferreteria, 'tipoDocumento': '99'}]}), 200),
    ).buscar('e1', '800');
    expect(respuesta, isA<Rechazo<ResultadoDeBusqueda>>());
  });
}
