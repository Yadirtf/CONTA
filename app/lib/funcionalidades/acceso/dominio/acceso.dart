// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// Respuesta de la API a un paso del acceso: lo pedido o el rechazo con palabras para el dueño.
sealed class Respuesta<T> {
  const Respuesta();
}

final class Exito<T> extends Respuesta<T> {
  const Exito(this.valor);
  final T valor;
}

final class Rechazo<T> extends Respuesta<T> {
  const Rechazo(this.codigo, this.mensaje, {this.reintentarDesde, this.intentosRestantes});

  /// Código estable de la API (acceso.bloqueado, acceso.codigo-incorrecto…) o «sin-conexion».
  final String codigo;
  final String mensaje;
  final DateTime? reintentarDesde;
  final int? intentosRestantes;

  static const sinConexion = 'sin-conexion';
}

final class CodigoEnviado {
  const CodigoEnviado({required this.venceEn, required this.otroCodigoDesde});
  final DateTime venceEn;
  final DateTime otroCodigoDesde;
}

/// Sesión del dispositivo. El token se guarda en el almacén seguro y viaja como «Authorization: Bearer».
final class SesionGuardada {
  const SesionGuardada({required this.token, required this.venceEn, required this.celular});
  final String token;
  final DateTime venceEn;
  final String celular;

  bool vigente(DateTime ahora) => ahora.isBefore(venceEn);
}

/// Contrato con la API de acceso. Lo implementa la capa de datos.
abstract interface class RepositorioDeAcceso {
  Future<Respuesta<CodigoEnviado>> pedirCodigo(String celular);
  Future<Respuesta<SesionGuardada>> entrar(String celular, String codigo);
  Future<void> salir(String token);
}

/// Dónde vive la sesión en el dispositivo. Nunca en almacenamiento sin cifrar.
abstract interface class AlmacenDeSesion {
  Future<SesionGuardada?> leer();
  Future<void> guardar(SesionGuardada sesion);
  Future<void> borrar();
}
