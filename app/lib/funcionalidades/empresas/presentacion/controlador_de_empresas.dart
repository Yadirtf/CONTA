import 'package:material_ui/material_ui.dart';

import '../dominio/empresas.dart';

enum PasoDeEmpresas { cargando, sinConexion, crear, elegir, adentro }

/// Estado de «en qué empresa trabajo» (HU-04.02): listar, elegir, crear y cambiar. Las pantallas solo lo muestran.
/// Vive mientras dura la sesión: al salir se descarta con todo lo que sabía.
class ControladorDeEmpresas extends ChangeNotifier {
  ControladorDeEmpresas(this._repositorio, {this.alPerderSesion});

  final RepositorioDeEmpresas _repositorio;

  /// Se llama si la API dice que la sesión ya no sirve.
  final VoidCallback? alPerderSesion;

  PasoDeEmpresas paso = PasoDeEmpresas.cargando;
  bool ocupado = false;
  String? aviso;
  List<Empresa> empresas = const [];

  /// La empresa en la que se trabaja. Todo lo de adentro se pide en su nombre.
  Empresa? elegida;

  /// Al entrar: sin empresas, a crear la primera; con una, directo a ella; con varias, a elegir.
  Future<void> cargar() async {
    _ir(PasoDeEmpresas.cargando);
    switch (await _repositorio.misEmpresas()) {
      case Exito(:final valor):
        empresas = valor;
        aviso = null;
        if (valor.isEmpty) return _ir(PasoDeEmpresas.crear);
        if (valor.length == 1) return elegir(valor.single);
        _ir(PasoDeEmpresas.elegir);
      case final Rechazo<List<Empresa>> rechazo:
        if (_sesionPerdida(rechazo)) return;
        aviso = rechazo.mensaje;
        _ir(PasoDeEmpresas.sinConexion);
    }
  }

  void elegir(Empresa empresa) {
    elegida = empresa;
    aviso = null;
    _ir(PasoDeEmpresas.adentro);
  }

  /// Vuelve a la lista. Lo de la empresa anterior se descarta al salir de adentro.
  void cambiar() {
    elegida = null;
    aviso = null;
    _ir(empresas.isEmpty ? PasoDeEmpresas.crear : PasoDeEmpresas.elegir);
  }

  void irACrear() {
    aviso = null;
    _ir(PasoDeEmpresas.crear);
  }

  Future<void> crear(String razonSocial) async {
    final nombre = razonSocial.trim();
    if (nombre.isEmpty) {
      aviso = 'Escribe el nombre de tu negocio.';
      return notifyListeners();
    }
    ocupado = true;
    notifyListeners();
    try {
      switch (await _repositorio.crear(nombre)) {
        case Exito(:final valor):
          empresas = [...empresas, valor]..sort((a, b) => a.razonSocial.compareTo(b.razonSocial));
          elegir(valor);
        case final Rechazo<Empresa> rechazo:
          if (!_sesionPerdida(rechazo)) aviso = rechazo.mensaje;
      }
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }

  /// true si la sesión ya no sirve; en ese caso avisa a quien la maneja.
  bool _sesionPerdida(Rechazo<Object?> rechazo) {
    if (rechazo.codigo != sinSesion) return false;
    alPerderSesion?.call();
    return true;
  }

  void _ir(PasoDeEmpresas nuevo) {
    paso = nuevo;
    notifyListeners();
  }
}
