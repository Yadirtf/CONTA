// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import '../../../nucleo/respuesta.dart';

export '../../../nucleo/respuesta.dart';

/// Código de la API cuando el negocio pide la verificación en dos pasos (HU-04.04).
const segundoPasoRequerido = 'acceso.segundo-factor-requerido';

/// Cómo está la verificación en dos pasos de la persona y de esta sesión.
final class EstadoDeVerificacion {
  const EstadoDeVerificacion({required this.appConfigurada, required this.sesionVerificada, required this.codigosRestantes});

  /// true si la persona ya configuró su app de verificación (Google Authenticator u otra).
  final bool appConfigurada;

  /// true si esta sesión ya pasó el segundo paso y sigue vigente (una jornada).
  final bool sesionVerificada;
  final int codigosRestantes;
}

/// Clave que se muestra una sola vez para configurar la app de verificación.
final class AppPorConfigurar {
  const AppPorConfigurar({required this.clave, required this.enlace});

  /// En base32, para escribirla a mano.
  final String clave;

  /// otpauth://…, para el código QR.
  final String enlace;

  /// La clave en grupos de 4, más fácil de copiar a mano: «JBSW Y3DP …».
  String get claveLegible => [
    for (var i = 0; i < clave.length; i += 4) clave.substring(i, i + 4 > clave.length ? clave.length : i + 4),
  ].join(' ');
}

/// Contrato con la API de la verificación en dos pasos (/acceso/segundo-factor). Todo pide la sesión.
abstract interface class RepositorioDeVerificacion {
  Future<Respuesta<EstadoDeVerificacion>> estado();

  /// Crea la clave de la app. Si la persona ya tiene una, la API exige haber verificado hace poco.
  Future<Respuesta<AppPorConfigurar>> configurar();

  /// Confirma la app con su primer código. Devuelve los códigos de recuperación, que se ven una sola vez.
  Future<Respuesta<List<String>>> confirmar(String codigo);

  /// Pasa el segundo paso con un código de la app o uno de recuperación.
  Future<Respuesta<void>> verificar(String codigo);
}
