import '../dominio/ventas.dart';

/// Lee una venta de la API. Un estado desconocido es un error de formato: nunca se muestra un estado inventado.
VentaEmitida ventaDeJson(Object? datos) {
  final d = datos as Map;
  return VentaEmitida(
    id: d['id'] as String,
    numero: d['numero'] as String,
    comprador: d['comprador'] as String,
    total: d['total'] as String,
    iva: d['iva'] as String,
    estado: EstadoDeLaVenta.de(d['estado']) ?? (throw const FormatException('Estado desconocido')),
    mensaje: d['mensaje'] as String,
    documento: _documentoDe(d['documento']),
    motivos: [for (final m in (d['motivos'] as List?) ?? const []) m as String],
  );
}

/// Solo ids, cantidades en texto y el medio de pago: la API rechaza un precio o un total que venga de la app.
Map<String, Object?> jsonDePedido(PedidoDeVenta pedido) => {
  'id': pedido.id,
  'lineas': [
    for (final l in pedido.carrito.lineas) {'productoId': l.articulo.id, 'cantidad': '${l.cantidad}'},
  ],
  'compradorId': pedido.comprador?.id,
  'medioDePago': pedido.medioDePago.valor,
  'documento': pedido.conFactura ? 'factura' : 'automatico',
};

/// Lee una fila de «Mis ventas». Igual que la venta: un estado desconocido es un error de formato.
VentaReciente ventaRecienteDeJson(Object? datos) {
  final d = datos as Map;
  return VentaReciente(
    id: d['id'] as String,
    numero: d['numero'] as String,
    emitidaEn: DateTime.parse(d['emitidaEn'] as String),
    comprador: d['comprador'] as String,
    total: d['total'] as String,
    estado: EstadoDeLaVenta.de(d['estado']) ?? (throw const FormatException('Estado desconocido')),
    documento: _documentoDe(d['documento']),
  );
}

/// Una API anterior a HU-06.02 no manda el documento: todo era factura. Uno desconocido es un error de formato,
/// igual que el estado: nunca se muestra un documento inventado.
DocumentoDeLaVenta _documentoDe(Object? valor) => valor == null
    ? DocumentoDeLaVenta.factura
    : DocumentoDeLaVenta.de(valor) ?? (throw const FormatException('Documento desconocido'));
