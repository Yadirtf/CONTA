// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import 'dart:typed_data';

import '../../../nucleo/respuesta.dart';
import 'carrito.dart';
import 'comprobante.dart';
import 'venta.dart';

export '../../../nucleo/pesos.dart';
export '../../../nucleo/respuesta.dart';
export 'carrito.dart';
export 'centavos.dart';
export 'comprobante.dart';
export 'documento_de_la_venta.dart';
export 'medio_de_pago.dart';
export 'venta.dart';

/// Contrato con la API de ventas. Todo se pide dentro de un negocio (X-Empresa).
abstract interface class RepositorioDeVentas {
  /// Guarda la venta y deja su factura en camino a la DIAN. Con el mismo id y el mismo pedido devuelve la misma.
  Future<Respuesta<VentaEmitida>> registrar(String empresaId, PedidoDeVenta pedido);

  /// La venta con su estado ante la DIAN, para seguirla en la pantalla «Listo».
  Future<Respuesta<VentaEmitida>> consultar(String empresaId, String ventaId);

  /// Las últimas ventas del negocio, la más nueva primero, para «Mis ventas» (HU-06.08).
  Future<Respuesta<List<VentaReciente>>> recientes(String empresaId);

  /// El PDF de la factura. Mientras va para la DIAN responde el rechazo `comprobante.en-camino`.
  Future<Respuesta<Uint8List>> comprobante(String empresaId, String ventaId);
}

/// Busca qué vender. La composición lo conecta con el catálogo de productos: ventas no conoce sus datos.
typedef BuscarArticulos = Future<Respuesta<List<ArticuloEnVenta>>> Function(String texto);
