// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

sealed class EstadoApi {
  const EstadoApi();
}

final class ApiViva extends EstadoApi {
  const ApiViva(this.version);
  final String version;
}

final class ApiSinRespuesta extends EstadoApi {
  const ApiSinRespuesta();
}

final class ApiSinConfigurar extends EstadoApi {
  const ApiSinConfigurar();
}

/// Contrato que implementa la capa de datos.
abstract interface class RepositorioSalud {
  Future<EstadoApi> consultar();
}

/// Texto para el dueño o el cajero, con palabras sencillas.
String mensajeDeEstado(EstadoApi estado) => switch (estado) {
      ApiViva(:final version) => 'Conectado (versión $version).',
      ApiSinRespuesta() => 'Sin conexión con el servidor. Intenta de nuevo en un minuto.',
      ApiSinConfigurar() => 'Esta versión no sabe a qué servidor conectarse.',
    };
