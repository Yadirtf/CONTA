import 'package:conta_app/funcionalidades/miembros/dominio/miembros.dart';

/// API de personas falsa: guarda lo que se pidió y responde como la API real.
class RepositorioDeMiembrosFalso implements RepositorioDeMiembros {
  RepositorioDeMiembrosFalso([List<Miembro>? miembros]) : miembros = [...?miembros];

  final List<Miembro> miembros;

  /// Negocios que viajaron en X-Empresa, en orden.
  final empresasPedidas = <String>[];

  /// Si no es null, la próxima invitación responde este rechazo.
  Rechazo<Miembro>? rechazoAlInvitar;

  @override
  Future<Respuesta<List<Miembro>>> listar(String empresaId) async {
    empresasPedidas.add(empresaId);
    return Exito([...miembros]);
  }

  @override
  Future<Respuesta<Miembro>> invitar(String empresaId, String celular, Rol rol) async {
    empresasPedidas.add(empresaId);
    if (rechazoAlInvitar case final rechazo?) return rechazo;
    final nuevo = Miembro(usuarioId: 'u-$celular', celular: '+57 ${celular.substring(0, 3)} *** ${celular.substring(6)}', rol: rol, invitado: true);
    miembros.add(nuevo);
    return Exito(nuevo);
  }

  @override
  Future<Respuesta<void>> retirar(String empresaId, String usuarioId) async {
    empresasPedidas.add(empresaId);
    miembros.removeWhere((m) => m.usuarioId == usuarioId);
    return const Exito(null);
  }
}

const dueno = Miembro(usuarioId: 'u-dueno', celular: '+57 300 *** 0001', rol: Rol.dueno, invitado: false);
const cajera = Miembro(usuarioId: 'u-cajera', celular: '+57 300 *** 0002', rol: Rol.cajero, invitado: false);
