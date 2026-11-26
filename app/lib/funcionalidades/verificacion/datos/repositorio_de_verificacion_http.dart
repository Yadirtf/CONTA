import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/verificacion.dart';

/// Verificación en dos pasos con la API de CONTA (HU-04.04): /acceso/segundo-factor, siempre con la sesión.
class RepositorioDeVerificacionHttp implements RepositorioDeVerificacion {
  RepositorioDeVerificacionHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;
  static const _ruta = '/acceso/segundo-factor';

  @override
  Future<Respuesta<EstadoDeVerificacion>> estado() => _api.pedir('GET', _ruta, (d) {
    final datos = d as Map;
    return EstadoDeVerificacion(
      appConfigurada: datos['inscrito'] == true,
      sesionVerificada: datos['verificadaHasta'] != null,
      codigosRestantes: (datos['codigosDeRecuperacionRestantes'] as num?)?.toInt() ?? 0,
    );
  });

  @override
  Future<Respuesta<AppPorConfigurar>> configurar() => _api.pedir('POST', '$_ruta/inscripcion', (d) {
    final datos = d as Map;
    return AppPorConfigurar(clave: datos['secreto'] as String, enlace: datos['uri'] as String);
  });

  @override
  Future<Respuesta<List<String>>> confirmar(String codigo) => _api.pedir(
    'POST',
    '$_ruta/inscripcion/confirmacion',
    (d) => ((d as Map)['codigosDeRecuperacion'] as List).whereType<String>().toList(),
    cuerpo: {'codigo': codigo},
  );

  @override
  Future<Respuesta<void>> verificar(String codigo) =>
      _api.pedir('POST', '$_ruta/verificacion', (_) {}, cuerpo: {'codigo': codigo});
}
