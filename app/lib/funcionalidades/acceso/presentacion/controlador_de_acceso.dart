import 'package:material_ui/material_ui.dart';

import '../dominio/acceso.dart';
import '../dominio/celular.dart';

enum PasoDeAcceso { cargando, celular, codigo, adentro }

/// Estado del acceso (HU-04.01): pedir el código, escribirlo y entrar. Las pantallas solo lo muestran.
class ControladorDeAcceso extends ChangeNotifier {
  ControladorDeAcceso(this._repositorio, this._almacen, {DateTime Function()? reloj}) : _ahora = reloj ?? DateTime.now;

  final RepositorioDeAcceso _repositorio;
  final AlmacenDeSesion _almacen;
  final DateTime Function() _ahora;

  PasoDeAcceso paso = PasoDeAcceso.cargando;
  bool ocupado = false;

  /// Lo que salió mal, en palabras de la calle. null si no hay nada que decir.
  String? aviso;
  String celular = '';
  DateTime? otroCodigoDesde;
  SesionGuardada? sesion;

  /// Al abrir la app: si hay una sesión vigente en el dispositivo, entra directo.
  Future<void> iniciar() async {
    final guardada = await _almacen.leer();
    if (guardada != null && guardada.vigente(_ahora())) {
      sesion = guardada;
      _ir(PasoDeAcceso.adentro);
    } else {
      if (guardada != null) await _almacen.borrar();
      _ir(PasoDeAcceso.celular);
    }
  }

  Future<void> pedirCodigo(String texto) async {
    final normal = celularNormalizado(texto);
    if (normal == null) {
      _avisar('Escribe tu celular de 10 números. Empieza por 3.');
      return;
    }
    celular = normal;
    await _ocupado(() async {
      switch (await _repositorio.pedirCodigo(normal)) {
        case Exito(:final valor):
          otroCodigoDesde = valor.otroCodigoDesde;
          aviso = null;
          paso = PasoDeAcceso.codigo;
        case final Rechazo<CodigoEnviado> rechazo:
          if (rechazo.codigo == 'acceso.espera') {
            otroCodigoDesde = rechazo.reintentarDesde;
            paso = PasoDeAcceso.codigo;
          }
          aviso = rechazo.mensaje;
      }
    });
  }

  Future<void> entrar(String codigo) async {
    if (!RegExp(r'^\d{6}$').hasMatch(codigo)) {
      _avisar('El código tiene 6 números.');
      return;
    }
    await _ocupado(() async {
      switch (await _repositorio.entrar(celular, codigo)) {
        case Exito(:final valor):
          await _almacen.guardar(valor);
          sesion = valor;
          aviso = null;
          paso = PasoDeAcceso.adentro;
        case final Rechazo<SesionGuardada> rechazo:
          aviso = _mensajeDeRechazo(rechazo);
      }
    });
  }

  void cambiarCelular() {
    aviso = null;
    _ir(PasoDeAcceso.celular);
  }

  Future<void> salir() async {
    final actual = sesion;
    sesion = null;
    await _almacen.borrar();
    _ir(PasoDeAcceso.celular);
    if (actual != null) await _repositorio.salir(actual.token);
  }

  String _mensajeDeRechazo(Rechazo<Object?> rechazo) {
    final quedan = rechazo.intentosRestantes;
    if (quedan == null) return rechazo.mensaje;
    return '${rechazo.mensaje} ${quedan == 1 ? 'Te queda 1 intento.' : 'Te quedan $quedan intentos.'}';
  }

  Future<void> _ocupado(Future<void> Function() trabajo) async {
    ocupado = true;
    notifyListeners();
    try {
      await trabajo();
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }

  void _avisar(String texto) {
    aviso = texto;
    notifyListeners();
  }

  void _ir(PasoDeAcceso nuevo) {
    paso = nuevo;
    notifyListeners();
  }
}
