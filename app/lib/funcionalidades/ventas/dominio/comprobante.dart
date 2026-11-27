// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import 'dart:typed_data';

import 'documento_de_la_venta.dart';
import 'venta.dart';

/// El PDF de una factura aceptada, listo para compartir como archivo (HU-06.08). No hay enlace público: el PDF
/// llega con la sesión del negocio y se entrega a la app que la persona elija (WhatsApp, correo…).
final class ComprobanteParaCompartir {
  ComprobanteParaCompartir({required this.numero, required this.pdf});

  /// «SETP990000001».
  final String numero;
  final Uint8List pdf;

  /// El mismo nombre que pone la API: «factura-SETP990000001.pdf».
  String get nombreDeArchivo => 'factura-$numero.pdf';

  /// Lo que acompaña al archivo en el mensaje.
  String get texto => 'Factura electrónica $numero';
}

/// Entrega el PDF al menú de compartir del teléfono. La composición pone la implementación de la plataforma.
abstract interface class CompartidorDeComprobantes {
  Future<void> compartir(ComprobanteParaCompartir comprobante);
}

/// Una fila de «Mis ventas», como la responde la API.
final class VentaReciente {
  const VentaReciente({
    required this.id,
    required this.numero,
    required this.emitidaEn,
    required this.comprador,
    required this.total,
    required this.estado,
    this.documento = DocumentoDeLaVenta.factura,
  });

  final String id;
  final String numero;
  final DateTime emitidaEn;
  final String comprador;
  final String total;
  final EstadoDeLaVenta estado;

  /// HU-06.02: factura electrónica o tiquete POS electrónico.
  final DocumentoDeLaVenta documento;
}
