// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import '../../../nucleo/respuesta.dart';

export '../../../nucleo/respuesta.dart';

/// Una empresa a la que pertenece la persona (HU-04.02).
final class Empresa {
  const Empresa({required this.id, required this.razonSocial});
  final String id;
  final String razonSocial;

  @override
  bool operator ==(Object other) => other is Empresa && other.id == id && other.razonSocial == razonSocial;

  @override
  int get hashCode => Object.hash(id, razonSocial);
}

/// Código de la API cuando la sesión ya no sirve: hay que volver a entrar.
const sinSesion = 'acceso.sin-sesion';

/// Contrato con la API de empresas. Toda petición dentro de una empresa la nombra (encabezado X-Empresa).
abstract interface class RepositorioDeEmpresas {
  /// Las empresas de la persona, por razón social.
  Future<Respuesta<List<Empresa>>> misEmpresas();

  /// Crea una empresa; quien la crea queda como miembro.
  Future<Respuesta<Empresa>> crear(String razonSocial);

  /// Datos de la empresa, pedidos dentro de ella: la API responde solo si la persona pertenece.
  Future<Respuesta<Empresa>> datosDe(String empresaId);
}
