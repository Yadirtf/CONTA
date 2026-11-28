import 'package:http/http.dart' as http;

import '../../../nucleo/api/cliente_de_api.dart';
import '../dominio/configuracion_dian.dart';
import '../dominio/lo_que_se_escribe.dart';
import 'configuracion_de_json.dart';
import 'cuerpos_de_configuracion.dart';

/// Configuración DIAN con la API de CONTA (/configuracion-dian), siempre con X-Empresa. Nada se guarda en el
/// teléfono: el PIN y la clave técnica solo viajan al guardarlos y nunca vuelven.
class RepositorioDeConfiguracionDianHttp implements RepositorioDeConfiguracionDian {
  RepositorioDeConfiguracionDianHttp(
    String urlApi, {
    required String? Function() token,
    http.Client? cliente,
    Duration limite = const Duration(seconds: 20),
  }) : _api = ClienteDeApi(urlApi, token: token, cliente: cliente, limite: limite);

  final ClienteDeApi _api;
  static const _ruta = '/configuracion-dian';

  @override
  Future<Respuesta<ConfiguracionDian>> obtener(String empresaId) =>
      _api.pedir('GET', _ruta, (d) => configuracionDeJson(d as Map), empresaId: empresaId);

  @override
  Future<Respuesta<void>> guardarDatosFiscales(String empresaId, DatosFiscalesNuevos datos) =>
      _api.pedir('PUT', '$_ruta/datos-fiscales', (_) {}, empresaId: empresaId, cuerpo: cuerpoDeDatosFiscales(datos));

  @override
  Future<Respuesta<void>> agregarResolucion(String empresaId, ResolucionNueva resolucion) =>
      _api.pedir('POST', '$_ruta/resoluciones', (_) {}, empresaId: empresaId, cuerpo: cuerpoDeResolucion(resolucion));

  @override
  Future<Respuesta<void>> guardarSoftware(String empresaId, ClaseDeDocumento clase, SoftwareNuevo software) => _api.pedir(
    'PUT',
    '$_ruta/software/${clase.codigo}',
    (_) {},
    empresaId: empresaId,
    cuerpo: cuerpoDeSoftware(software),
  );

  @override
  Future<Respuesta<void>> guardarSiempreFactura(String empresaId, bool siempreFactura) => _api.pedir(
    'PUT',
    '$_ruta/preferencias',
    (_) {},
    empresaId: empresaId,
    cuerpo: {'siempreFactura': siempreFactura},
  );
}
