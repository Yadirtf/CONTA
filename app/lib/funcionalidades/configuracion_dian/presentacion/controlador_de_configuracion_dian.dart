import 'package:material_ui/material_ui.dart';

import '../dominio/configuracion_dian.dart';
import '../dominio/lo_que_se_escribe.dart';

/// Pide el código de la app de verificación otra vez y dice si la persona lo pasó. Lo da la pantalla.
typedef VerificarDeNuevo = Future<bool> Function();

/// Estado de la configuración DIAN del negocio (HU-07.04): la carga, guarda cada sección por separado y, si la
/// API pide una verificación reciente, la pide una vez y repite lo que se estaba guardando. Las pantallas solo
/// lo muestran.
class ControladorDeConfiguracionDian extends ChangeNotifier {
  ControladorDeConfiguracionDian(this._repositorio, this.empresaId, {required this.verificarDeNuevo});

  final RepositorioDeConfiguracionDian _repositorio;
  final String empresaId;
  final VerificarDeNuevo verificarDeNuevo;

  bool cargando = true;
  bool ocupado = false;
  String? aviso;
  ConfiguracionDian? configuracion;

  Future<void> cargar() async {
    cargando = configuracion == null;
    notifyListeners();
    switch (await _repositorio.obtener(empresaId)) {
      case Exito(:final valor):
        configuracion = valor;
        aviso = null;
      case Rechazo(:final mensaje):
        aviso = mensaje;
    }
    cargando = false;
    notifyListeners();
  }

  Future<bool> guardarDatosFiscales(DatosFiscalesNuevos datos) =>
      _guardar(() => _repositorio.guardarDatosFiscales(empresaId, datos));

  Future<bool> agregarResolucion(ResolucionNueva resolucion) =>
      _guardar(() => _repositorio.agregarResolucion(empresaId, resolucion));

  Future<bool> guardarSoftware(ClaseDeDocumento clase, SoftwareNuevo software) =>
      _guardar(() => _repositorio.guardarSoftware(empresaId, clase, software));

  Future<bool> guardarSiempreFactura(bool siempreFactura) =>
      _guardar(() => _repositorio.guardarSiempreFactura(empresaId, siempreFactura));

  /// Guarda, vuelve a leer lo que quedó y devuelve true. Si no se pudo, deja el aviso de la API.
  Future<bool> _guardar(Future<Respuesta<void>> Function() accion) async {
    if (ocupado) return false;
    ocupado = true;
    aviso = null;
    notifyListeners();
    try {
      var respuesta = await accion();
      if (respuesta case Rechazo(codigo: verificacionRecienteRequerida) when await verificarDeNuevo()) {
        respuesta = await accion();
      }
      switch (respuesta) {
        case Exito():
          await cargar();
          return true;
        case Rechazo(codigo: verificacionRecienteRequerida):
          aviso = 'Para cambiar la configuración, escribe el código de tu app de verificación.';
          return false;
        case Rechazo(:final mensaje):
          aviso = mensaje;
          return false;
      }
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }
}
