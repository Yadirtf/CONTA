// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import 'carrito.dart';
import 'documento_de_la_venta.dart';
import 'medio_de_pago.dart';

/// A quién se le vende. Sin comprador, la factura va a consumidor final.
final class CompradorDeLaVenta {
  const CompradorDeLaVenta({required this.id, required this.nombre});

  final String id;
  final String nombre;
}

/// Lo que se manda para vender. Solo ids y cantidades: el precio y el IVA los pone la API desde el catálogo.
/// El id lo pone la app: repetir el envío (por ejemplo, sin señal) no crea dos ventas.
final class PedidoDeVenta {
  const PedidoDeVenta({
    required this.id,
    required this.carrito,
    required this.medioDePago,
    this.comprador,
    this.pideFactura = false,
  });

  final String id;
  final Carrito carrito;
  final MedioDePago medioDePago;
  final CompradorDeLaVenta? comprador;

  /// HU-06.02: el cliente pidió factura electrónica aunque vaya a consumidor final.
  final bool pideFactura;

  /// Con comprador siempre sale factura a su nombre; sin él, la API elige el documento (nunca se fuerza el POS).
  bool get conFactura => pideFactura || comprador != null;
}

/// Dónde va la factura ante la DIAN: guardada y enviándose, aprobada o no aceptada.
enum EstadoDeLaVenta {
  pendiente('pendiente'),
  aceptada('aceptada'),
  rechazada('rechazada');

  const EstadoDeLaVenta(this.valor);

  final String valor;

  static EstadoDeLaVenta? de(Object? valor) => values.where((e) => e.valor == valor).firstOrNull;
}

/// Una venta guardada con su número de factura (HU-06.01), como la responde la API.
final class VentaEmitida {
  const VentaEmitida({
    required this.id,
    required this.numero,
    required this.comprador,
    required this.total,
    required this.iva,
    required this.estado,
    required this.mensaje,
    this.documento = DocumentoDeLaVenta.factura,
    this.motivos = const [],
  });

  final String id;

  /// «SETP990000001».
  final String numero;
  final String comprador;
  final String total;
  final String iva;
  final EstadoDeLaVenta estado;

  /// Con palabras del modo simple, escrito por la API.
  final String mensaje;

  /// HU-06.02: factura electrónica o tiquete POS electrónico.
  final DocumentoDeLaVenta documento;

  /// Por qué la DIAN no la aceptó, si la rechazó.
  final List<String> motivos;
}
