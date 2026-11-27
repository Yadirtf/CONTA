// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// Con qué documento salió la venta ante la DIAN (HU-06.02). Lo decide la API: tiquete POS electrónico si es a
/// consumidor final, el negocio lo tiene habilitado y no pasa de 5 UVT sin impuestos; si no, factura electrónica.
enum DocumentoDeLaVenta {
  factura('factura', 'Factura electrónica'),
  pos('pos', 'Tiquete POS electrónico');

  const DocumentoDeLaVenta(this.valor, this.nombre);

  final String valor;

  /// Para mostrar en «Listo» y en «Mis ventas».
  final String nombre;

  static DocumentoDeLaVenta? de(Object? valor) => values.where((d) => d.valor == valor).firstOrNull;
}
