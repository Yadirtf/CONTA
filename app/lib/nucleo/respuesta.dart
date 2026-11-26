/// Respuesta de la API: lo pedido o el rechazo con palabras para el dueño. Dart puro: la usan los dominios.
sealed class Respuesta<T> {
  const Respuesta();
}

final class Exito<T> extends Respuesta<T> {
  const Exito(this.valor);
  final T valor;
}

final class Rechazo<T> extends Respuesta<T> {
  const Rechazo(this.codigo, this.mensaje, {this.reintentarDesde, this.intentosRestantes});

  /// Código estable de la API (acceso.bloqueado, empresa.no-encontrada…) o «sin-conexion».
  final String codigo;
  final String mensaje;
  final DateTime? reintentarDesde;
  final int? intentosRestantes;

  static const sinConexion = 'sin-conexion';
}
