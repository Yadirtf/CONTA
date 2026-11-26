import 'package:material_ui/material_ui.dart';

import '../dominio/verificacion.dart';

enum PasoDeVerificacion { cargando, sinConexion, configurar, guardarCodigos, verificar, listo }

/// Estado de la verificación en dos pasos al entrar a un negocio que la exige (HU-04.04): configurar la app la
/// primera vez, guardar los códigos de recuperación y, en cada sesión nueva, escribir el código. Las pantallas
/// solo lo muestran. Quien decide si hace falta es la API.
class ControladorDeVerificacion extends ChangeNotifier {
  ControladorDeVerificacion(this._repositorio, {this.alPerderSesion});

  final RepositorioDeVerificacion _repositorio;

  /// Se llama si la API dice que la sesión ya no sirve.
  final VoidCallback? alPerderSesion;

  PasoDeVerificacion paso = PasoDeVerificacion.cargando;
  bool ocupado = false;
  String? aviso;

  /// La clave de la app, mientras se configura. Se olvida al confirmar.
  AppPorConfigurar? app;

  /// Se muestran una sola vez, justo después de configurar la app.
  List<String> codigosDeRecuperacion = const [];

  Future<void> cargar() async {
    _ir(PasoDeVerificacion.cargando);
    switch (await _repositorio.estado()) {
      case Exito(:final valor) when valor.sesionVerificada:
        _ir(PasoDeVerificacion.listo);
      case Exito(:final valor) when valor.appConfigurada:
        _ir(PasoDeVerificacion.verificar);
      case Exito():
        await _pedirClave();
      case final Rechazo<EstadoDeVerificacion> rechazo:
        if (_sesionPerdida(rechazo)) return;
        aviso = rechazo.mensaje;
        _ir(PasoDeVerificacion.sinConexion);
    }
  }

  /// Confirma la app con su primer código y pasa a mostrar los códigos de recuperación.
  Future<void> confirmar(String codigo) => _enviar(codigo, () async {
    switch (await _repositorio.confirmar(codigo.trim())) {
      case Exito(:final valor):
        app = null;
        codigosDeRecuperacion = valor;
        _ir(PasoDeVerificacion.guardarCodigos);
      case final Rechazo<List<String>> rechazo:
        if (!_sesionPerdida(rechazo)) aviso = rechazo.mensaje;
    }
  });

  /// La persona dice que ya guardó sus códigos: se olvidan y entra al negocio.
  void codigosGuardados() {
    codigosDeRecuperacion = const [];
    _ir(PasoDeVerificacion.listo);
  }

  /// Pasa el segundo paso con un código de la app o uno de recuperación.
  Future<void> verificar(String codigo) => _enviar(codigo, () async {
    switch (await _repositorio.verificar(codigo.trim())) {
      case Exito():
        _ir(PasoDeVerificacion.listo);
      case final Rechazo<void> rechazo:
        if (!_sesionPerdida(rechazo)) aviso = rechazo.mensaje;
    }
  });

  Future<void> _pedirClave() async {
    switch (await _repositorio.configurar()) {
      case Exito(:final valor):
        app = valor;
        aviso = null;
        _ir(PasoDeVerificacion.configurar);
      case final Rechazo<AppPorConfigurar> rechazo:
        if (_sesionPerdida(rechazo)) return;
        aviso = rechazo.mensaje;
        _ir(PasoDeVerificacion.sinConexion);
    }
  }

  /// Un código vacío no se envía. Mientras va, se marca ocupado para que dos toques no lo envíen dos veces.
  Future<void> _enviar(String codigo, Future<void> Function() pedir) async {
    if (codigo.trim().isEmpty) {
      aviso = 'Escribe el código de tu app de verificación.';
      return notifyListeners();
    }
    ocupado = true;
    aviso = null;
    notifyListeners();
    try {
      await pedir();
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }

  bool _sesionPerdida(Rechazo<Object?> rechazo) {
    if (rechazo.codigo != 'acceso.sin-sesion') return false;
    alPerderSesion?.call();
    return true;
  }

  void _ir(PasoDeVerificacion nuevo) {
    paso = nuevo;
    notifyListeners();
  }
}
