// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import '../../../nucleo/respuesta.dart';
import 'membresia.dart';

export '../../../nucleo/respuesta.dart';
export 'membresia.dart';

/// Una empresa a la que pertenece la persona (HU-04.02), con lo que su membresía le da (HU-04.03).
/// [membresia] es null cuando la respuesta no la trae (los datos pedidos dentro de la empresa).
final class Empresa {
  const Empresa({required this.id, required this.razonSocial, this.membresia});
  final String id;
  final String razonSocial;
  final Membresia? membresia;

  bool get invitada => membresia?.invitada ?? false;

  @override
  bool operator ==(Object other) =>
      other is Empresa && other.id == id && other.razonSocial == razonSocial && other.membresia == membresia;

  @override
  int get hashCode => Object.hash(id, razonSocial, membresia);
}

/// Código de la API cuando la sesión ya no sirve: hay que volver a entrar.
const sinSesion = 'acceso.sin-sesion';

/// Contrato con la API de empresas. Toda petición dentro de una empresa la nombra (encabezado X-Empresa).
abstract interface class RepositorioDeEmpresas {
  /// Las empresas de la persona, por razón social, con su membresía (incluidas las invitaciones pendientes).
  Future<Respuesta<List<Empresa>>> misEmpresas();

  /// Crea una empresa; quien la crea queda como dueño.
  Future<Respuesta<Empresa>> crear(String razonSocial);

  /// Datos de la empresa, pedidos dentro de ella: la API responde solo si la persona pertenece.
  Future<Respuesta<Empresa>> datosDe(String empresaId);

  /// Acepta (true) o rechaza (false) la invitación a una empresa.
  Future<Respuesta<void>> responderInvitacion(String empresaId, {required bool aceptar});
}
