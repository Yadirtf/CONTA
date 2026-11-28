import 'dart:convert';

import 'package:conta_app/funcionalidades/configuracion_dian/datos/repositorio_de_configuracion_dian_http.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/dominio/configuracion_dian.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/dominio/lo_que_se_escribe.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

RepositorioDeConfiguracionDianHttp _repositorio(Future<http.Response> Function(http.Request) responder) =>
    RepositorioDeConfiguracionDianHttp('https://api.ejemplo', token: () => 'tok', cliente: MockClient(responder));

const _guardada = {
  'datosFiscales': {
    'nit': '900373076',
    'digitoVerificacion': 4,
    'razonSocial': 'Tienda Don Pepe S.A.S.',
    'tipoDePersona': 'juridica',
    'responsabilidadesFiscales': ['O-13'],
    'responsableDeIva': true,
    'direccion': {'codigoMunicipio': '11001', 'ciudad': 'Bogotá, D.C.', 'departamento': 'Bogotá', 'linea': 'Calle 1'},
    'correo': null,
  },
  'resoluciones': [
    {
      'id': 'r1',
      'clase': 'factura',
      'numero': '18760000001',
      'prefijo': 'SETP',
      'desde': 990000000,
      'hasta': 995000000,
      'vigenteDesde': '2019-01-19',
      'vigenteHasta': '2030-01-19',
      'siguiente': 990000003,
      'disponible': true,
      'conClaveTecnica': true,
    },
    {'id': 'r2', 'clase': 'nomina', 'numero': '1', 'prefijo': '', 'desde': 1, 'hasta': 2},
  ],
  'software': {
    'factura': {'idSoftware': 's1', 'testSetId': 't1', 'pin': '•••8', 'fabricante': null, 'actualizadoEn': '2026-11-28T12:00:00Z'},
    'pos': null,
  },
  'siempreFactura': true,
  'cambios': [],
  'loQueFalta': {'puedeFacturar': true, 'posActivo': false, 'pendientes': []},
};

void main() {
  test('lee la configuración con X-Empresa y descarta clases que no conoce', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode(_guardada), 200, headers: {'content-type': 'application/json; charset=utf-8'});
    }).obtener('e1');
    expect(pedido.url.toString(), 'https://api.ejemplo/configuracion-dian');
    expect(pedido.headers['X-Empresa'], 'e1');
    final c = (respuesta as Exito<ConfiguracionDian>).valor;
    expect(c.datosFiscales?.digitoVerificacion, 4);
    expect(c.resoluciones.map((r) => r.id), ['r1']);
    expect(c.softwareFactura?.pinTapado, '•••8');
    expect(c.softwarePos, isNull);
    expect(c.siempreFactura, isTrue);
    expect(c.loQueFalta.puedeFacturar, isTrue);
  });

  test('el software va a su clase y sin PIN no lo manda', () async {
    late http.Request pedido;
    await _repositorio((p) async {
      pedido = p;
      return http.Response('', 204);
    }).guardarSoftware('e1', ClaseDeDocumento.pos, const SoftwareNuevo(
      idSoftware: 's1',
      testSetId: 't1',
      fabricante: Fabricante(nombre: 'Pepe', razonSocial: 'Don Pepe'),
    ));
    expect(pedido.method, 'PUT');
    expect(pedido.url.path, '/configuracion-dian/software/pos');
    expect(jsonDecode(pedido.body), {
      'idSoftware': 's1',
      'testSetId': 't1',
      'fabricante': {'nombre': 'Pepe', 'razonSocial': 'Don Pepe'},
    });
  });

  test('agregar una resolución manda su id; la clave técnica solo si se escribió', () async {
    late http.Request pedido;
    final respuesta = await _repositorio((p) async {
      pedido = p;
      return http.Response(jsonEncode({'codigo': 'acceso.segundo-factor-reciente-requerido', 'mensaje': 'Confirma'}), 403);
    }).agregarResolucion('e1', const ResolucionNueva(
      id: 'r9',
      clase: ClaseDeDocumento.factura,
      numero: '1876',
      prefijo: 'FE',
      desde: 1,
      hasta: 100,
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2027-01-01',
    ));
    expect(pedido.url.path, '/configuracion-dian/resoluciones');
    expect((jsonDecode(pedido.body) as Map).containsKey('claveTecnica'), isFalse);
    expect((respuesta as Rechazo).codigo, verificacionRecienteRequerida);
  });
}
