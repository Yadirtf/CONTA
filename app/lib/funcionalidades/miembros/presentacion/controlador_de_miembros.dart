import 'package:material_ui/material_ui.dart';

import '../dominio/miembros.dart';

/// Estado de «las personas de mi negocio» (HU-04.03): listar, invitar y retirar. Las pantallas solo lo muestran.
class ControladorDeMiembros extends ChangeNotifier {
  ControladorDeMiembros(this._repositorio, this.empresaId);

  final RepositorioDeMiembros _repositorio;

  /// Negocio en el que se trabaja: viaja en X-Empresa en cada petición.
  final String empresaId;

  bool cargando = true;
  bool ocupado = false;
  String? aviso;
  List<Miembro> miembros = const [];

  Future<void> cargar() async {
    cargando = true;
    notifyListeners();
    switch (await _repositorio.listar(empresaId)) {
      case Exito(:final valor):
        miembros = valor;
        aviso = null;
      case Rechazo(:final mensaje):
        aviso = mensaje;
    }
    cargando = false;
    notifyListeners();
  }

  /// true si la invitación salió; si no, deja el aviso con lo que dijo la API.
  Future<bool> invitar(String celular, Rol rol) async {
    final numero = celular.replaceAll(RegExp(r'\D'), '');
    if (numero.isEmpty) {
      aviso = 'Escribe el celular de la persona.';
      notifyListeners();
      return false;
    }
    return _ocupado(() async {
      switch (await _repositorio.invitar(empresaId, numero, rol)) {
        case Exito(:final valor):
          miembros = [...miembros, valor];
          aviso = null;
          return true;
        case Rechazo(:final mensaje):
          aviso = mensaje;
          return false;
      }
    });
  }

  Future<void> retirar(Miembro miembro) => _ocupado(() async {
    switch (await _repositorio.retirar(empresaId, miembro.usuarioId)) {
      case Exito():
        miembros = miembros.where((m) => m.usuarioId != miembro.usuarioId).toList();
        aviso = null;
      case Rechazo(:final mensaje):
        aviso = mensaje;
    }
  });

  Future<T> _ocupado<T>(Future<T> Function() trabajo) async {
    ocupado = true;
    notifyListeners();
    try {
      return await trabajo();
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }
}
