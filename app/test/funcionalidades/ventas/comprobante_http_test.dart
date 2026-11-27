import 'dart:convert';
import 'dart:typed_data';

import 'package:conta_app/funcionalidades/ventas/datos/repositorio_de_ventas_http.dart';
import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:conta_app/nucleo/api/cliente_de_api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

RepositorioDeVentasHttp _con(Future<http.Response> Function(http.Request pedido) responder) =>
    RepositorioDeVentasHttp('https://api.ejemplo', token: () => 't', cliente: MockClient(responder));

final _pdf = Uint8List.fromList(utf8.encode('%PDF-1.3\n...'));

void main() {
  group('Comprobante por HTTP (HU-06.08)', () {
    test('descarga el PDF con la sesión y X-Empresa', () async {
      late http.Request enviado;
      final repositorio = _con((pedido) async {
        enviado = pedido;
        return http.Response.bytes(_pdf, 200, headers: {'content-type': 'application/pdf'});
      });
      final respuesta = await repositorio.comprobante('e1', 'v/1');
      expect(enviado.method, 'GET');
      expect(enviado.url.path, '/ventas/v%2F1/comprobante');
      expect(enviado.headers['Authorization'], 'Bearer t');
      expect(enviado.headers['X-Empresa'], 'e1');
      expect((respuesta as Exito<Uint8List>).valor, _pdf);
    });

    test('no acepta como factura algo que no es un PDF', () async {
      final html = _con((_) async => http.Response('<html>', 200, headers: {'content-type': 'text/html'}));
      final disfrazado = _con((_) async => http.Response('<html>', 200, headers: {'content-type': 'application/pdf'}));
      for (final r in [html, disfrazado]) {
        expect((await r.comprobante('e1', 'v1') as Rechazo).codigo, ClienteDeApi.respuestaInvalida);
      }
    });

    test('no acepta un PDF de más de 5 MB', () async {
      final grande = Uint8List(5 * 1024 * 1024 + 1)..setAll(0, _pdf);
      final r = _con((_) async => http.Response.bytes(grande, 200, headers: {'content-type': 'application/pdf'}));
      expect((await r.comprobante('e1', 'v1') as Rechazo).codigo, ClienteDeApi.respuestaInvalida);
    });

    test('traduce «todavía va para la DIAN» con el código de la API', () async {
      final r = _con(
        (_) async => http.Response(
          jsonEncode({'codigo': 'comprobante.en-camino', 'mensaje': 'Todavía va para la DIAN'}),
          409,
          headers: {'content-type': 'application/json'},
        ),
      );
      final rechazo = await r.comprobante('e1', 'v1') as Rechazo;
      expect(rechazo.codigo, 'comprobante.en-camino');
    });

    test('sin red responde sin-conexion', () async {
      final r = _con((_) async => throw http.ClientException('sin red'));
      expect((await r.comprobante('e1', 'v1') as Rechazo).codigo, Rechazo.sinConexion);
    });

    test('lee «Mis ventas» y rechaza un estado inventado', () async {
      Map<String, Object> fila(String estado) => {
        'id': 'v1',
        'numero': 'SETP990000001',
        'emitidaEn': '2026-11-27T15:00:00.000Z',
        'comprador': 'Consumidor final',
        'total': '7500.00',
        'estado': estado,
      };
      final bien = _con((_) async => http.Response(jsonEncode([fila('aceptada')]), 200));
      final lista = (await bien.recientes('e1') as Exito<List<VentaReciente>>).valor;
      expect(lista.single.estado, EstadoDeLaVenta.aceptada);
      expect(lista.single.emitidaEn, DateTime.utc(2026, 11, 27, 15));

      final mal = _con((_) async => http.Response(jsonEncode([fila('pagada')]), 200));
      expect(await mal.recientes('e1'), isA<Rechazo<List<VentaReciente>>>());
    });
  });
}
