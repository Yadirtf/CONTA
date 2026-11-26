// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import '../../../nucleo/respuesta.dart';
import '../../empresas/dominio/membresia.dart';

export '../../../nucleo/respuesta.dart';
export '../../empresas/dominio/membresia.dart' show Rol;

/// Una persona del negocio, como la ve el dueño (HU-04.03). El celular llega enmascarado.
final class Miembro {
  const Miembro({required this.usuarioId, required this.celular, required this.rol, required this.invitado});

  final String usuarioId;
  final String celular;
  final Rol rol;

  /// true si aún no acepta la invitación.
  final bool invitado;

  @override
  bool operator ==(Object other) =>
      other is Miembro &&
      other.usuarioId == usuarioId &&
      other.celular == celular &&
      other.rol == rol &&
      other.invitado == invitado;

  @override
  int get hashCode => Object.hash(usuarioId, celular, rol, invitado);
}

/// Contrato con la API de personas del negocio. Todo se pide dentro de un negocio (X-Empresa).
abstract interface class RepositorioDeMiembros {
  Future<Respuesta<List<Miembro>>> listar(String empresaId);

  /// Invita por celular con un rol. La persona entra cuando acepta.
  Future<Respuesta<Miembro>> invitar(String empresaId, String celular, Rol rol);

  /// Retira a la persona del negocio sin borrar su historia.
  Future<Respuesta<void>> retirar(String empresaId, String usuarioId);
}
