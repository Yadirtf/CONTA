// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import '../../../nucleo/respuesta.dart';
import 'comprador.dart';

export '../../../nucleo/respuesta.dart';
export 'comprador.dart';

/// Lo que devuelve buscar por documento (HU-05.01): los compradores encontrados y, si lo escrito es un NIT,
/// su dígito de verificación. El dígito lo calcula la API: las reglas de la DIAN viven allá.
final class ResultadoDeBusqueda {
  const ResultadoDeBusqueda({required this.nit, required this.compradores});

  final NitCalculado? nit;
  final List<Comprador> compradores;
}

final class NitCalculado {
  const NitCalculado(this.numero, this.digitoVerificacion);

  final String numero;
  final int digitoVerificacion;

  @override
  String toString() => '$numero-$digitoVerificacion';
}

/// Contrato con la API de compradores. Todo se pide dentro de un negocio (X-Empresa).
abstract interface class RepositorioDeClientes {
  /// Busca por el comienzo del documento (3 letras o números como mínimo).
  Future<Respuesta<ResultadoDeBusqueda>> buscar(String empresaId, String documento);

  /// El comprador genérico de la DIAN para quien no pide factura a su nombre.
  Future<Respuesta<Comprador>> consumidorFinal(String empresaId);

  /// Crea el comprador. Si su documento ya existía, la API devuelve el guardado.
  Future<Respuesta<Comprador>> crear(String empresaId, CompradorNuevo nuevo);
}
