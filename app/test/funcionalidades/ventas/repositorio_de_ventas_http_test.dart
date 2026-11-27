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
      'documento': 'factura',
    });
    expect((respuesta as Exito<VentaEmitida>).valor.estado, EstadoDeLaVenta.pendiente);
  });

  test('HU-06.02: sin comprador la API elige el documento, salvo que el cliente pida factura', () async {
    final cuerpos = <Object?>[];
    final repositorio = RepositorioDeVentasHttp(
      'https://api.ejemplo',
      token: () => 't',
      cliente: MockClient((pedido) async {
        cuerpos.add(jsonDecode(pedido.body));
        return http.Response(jsonEncode({..._venta, 'documento': 'pos', 'numero': 'EPOS1'}), 201);
      }),
    );
    final carrito = const Carrito().agregar(gaseosa);
    final respuesta = await repositorio.registrar(
      'e1',
      PedidoDeVenta(id: 'v1', carrito: carrito, medioDePago: MedioDePago.efectivo),
    );
    await repositorio.registrar(
      'e1',
      PedidoDeVenta(id: 'v2', carrito: carrito, medioDePago: MedioDePago.efectivo, pideFactura: true),
    );
    expect([for (final c in cuerpos) (c as Map)['documento']], ['automatico', 'factura']);
    expect((respuesta as Exito<VentaEmitida>).valor.documento, DocumentoDeLaVenta.pos);
  });

  test('HU-06.02: un documento desconocido no se muestra; sin documento (API anterior) es factura', () async {
    RepositorioDeVentasHttp con(Map<String, Object?> venta) => RepositorioDeVentasHttp(
      'https://api.ejemplo',
      token: () => 't',
      cliente: MockClient((_) async => http.Response(jsonEncode(venta), 200)),
    );
    expect(await con({..._venta, 'documento': 'nota'}).consultar('e1', 'v1'), isA<Rechazo<VentaEmitida>>());
    final anterior = await con(_venta).consultar('e1', 'v1');
    expect((anterior as Exito<VentaEmitida>).valor.documento, DocumentoDeLaVenta.factura);
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
