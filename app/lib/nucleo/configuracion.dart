/// Configuración que llega al compilar con --dart-define (ver .github/workflows/vista-previa.yml).
abstract final class Configuracion {
  /// URL de la API. En pruebas: https://conta-api-develop.onrender.com o la vista previa del PR.
  static const String urlApi = String.fromEnvironment('API_URL');
}
