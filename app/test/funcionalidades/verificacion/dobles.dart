import 'package:conta_app/funcionalidades/verificacion/dominio/verificacion.dart';

/// API de verificación en dos pasos falsa. El código correcto de la app es [codigoBueno].
class RepositorioDeVerificacionFalso implements RepositorioDeVerificacion {
  RepositorioDeVerificacionFalso({this.appConfigurada = false, this.sesionVerificada = false});

  bool appConfigurada;
  bool sesionVerificada;
  static const codigoBueno = '123456';
  static const recuperacion = ['ABCDE-FGHJK', 'KMNPQ-RSTUV'];

  /// Si no es null, la consulta del estado responde con este rechazo.
  Rechazo<EstadoDeVerificacion>? rechazoAlConsultar;
  final codigosEnviados = <String>[];

  @override
  Future<Respuesta<EstadoDeVerificacion>> estado() async =>
      rechazoAlConsultar ??
      Exito(EstadoDeVerificacion(appConfigurada: appConfigurada, sesionVerificada: sesionVerificada, codigosRestantes: 2));

  @override
  Future<Respuesta<AppPorConfigurar>> configurar() async =>
      const Exito(AppPorConfigurar(clave: 'JBSWY3DPEHPK3PXP', enlace: 'otpauth://totp/CONTA?secret=JBSWY3DPEHPK3PXP'));

  @override
  Future<Respuesta<List<String>>> confirmar(String codigo) async {
    codigosEnviados.add(codigo);
    if (codigo != codigoBueno) return const Rechazo('segundo-factor.codigo-incorrecto', 'El código no coincide.');
    appConfigurada = true;
    sesionVerificada = true;
    return const Exito(recuperacion);
  }

  @override
  Future<Respuesta<void>> verificar(String codigo) async {
    codigosEnviados.add(codigo);
    if (codigo != codigoBueno && !recuperacion.contains(codigo)) {
      return const Rechazo('segundo-factor.codigo-incorrecto', 'El código no coincide.');
    }
    sesionVerificada = true;
    return const Exito(null);
  }
}
