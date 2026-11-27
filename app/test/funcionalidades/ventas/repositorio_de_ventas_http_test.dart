import 'dart:convert';

import 'package:conta_app/funcionalidades/ventas/datos/repositorio_de_ventas_http.dart';
import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'dobles.dart';

const _venta = {
  'id': 'v1',
  'numero': 'SETP990000001',
  'emitidaEn': '2026-11-27T15:00:00.000Z',
  'comprador': 'Consumidor final',
  'total': '5000.00',
  'iva': '798.32',
  'estado': 'pendiente',
  'mensaje': 'Guardada. Se está enviando a la DIAN.',
  'motivos': <String>[],
};

void main() {
  test('manda solo ids, cantidades en texto y el medio, con X-Empresa', () async {
    late http.Request enviado;
    final repositorio = RepositorioDeVentasHttp(
      'https://api.ejemplo',
      token: () => 't',
      cliente: MockClient((pedido) async {
        enviado = pedido;
        return http.Response(jsonEncode(_venta), 201, headers: {'content-type': 'application/json'});
      }),
    );
    final pedido = PedidoDeVenta(
      id: 'v1',
      carrito: const Carrito().agregar(gaseosa).agregar(gaseosa),
      medioDePago: MedioDePago.tarjetaDebito,
      comprador: const CompradorDeLaVenta(id: 'c1', nombre: 'Rosa'),
    );
    final respuesta = await repositorio.registrar('e1', pedido);
    expect(enviado.url.path, '/ventas');
    expect(enviado.headers['X-Empresa'], 'e1');
    expect(jsonDecode(enviado.body), {
      'id': 'v1',
      'lineas': [
        {'productoId': 'p-gaseosa', 'cantidad': '2'},
      ],
      'compradorId': 'c1',
      'medioDePago': 'tarjeta-debito',
    });
    expect((respuesta as Exito<VentaEmitida>).valor.estado, EstadoDeLaVenta.pendiente);
  });

  test('un estado desconocido no se muestra como si fuera real', () async {
    final repositorio = RepositorioDeVentasHttp(
      'https://api.ejemplo',
      token: () => 't',
      cliente: MockClient((_) async => http.Response(jsonEncode({..._venta, 'estado': 'quien-sabe'}), 200)),
    );
    expect(await repositorio.consultar('e1', 'v1'), isA<Rechazo<VentaEmitida>>());
  });

  test('consulta por id con la ruta escapada', () async {
    late Uri url;
    final repositorio = RepositorioDeVentasHttp(
      'https://api.ejemplo',
      token: () => 't',
      cliente: MockClient((pedido) async {
        url = pedido.url;
        return http.Response(jsonEncode(_venta), 200);
      }),
    );
    await repositorio.consultar('e1', '../miembros');
    expect(url.path, '/ventas/..%2Fmiembros');
  });
}
