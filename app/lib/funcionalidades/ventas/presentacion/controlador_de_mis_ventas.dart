import 'package:material_ui/material_ui.dart';

import '../dominio/ventas.dart';

/// Carga «Mis ventas» (HU-06.08): las últimas del negocio, la más nueva primero.
class ControladorDeMisVentas extends ChangeNotifier {
  ControladorDeMisVentas(this._repositorio, this.empresaId);

  final RepositorioDeVentas _repositorio;
  final String empresaId;

  List<VentaReciente> ventas = const [];
  String? aviso;
  bool cargando = false;
  bool _cerrado = false;

  Future<void> cargar() async {
    cargando = true;
    aviso = null;
    notifyListeners();
    final respuesta = await _repositorio.recientes(empresaId);
    if (_cerrado) return;
    switch (respuesta) {
      case Exito(:final valor):
        ventas = valor;
      case Rechazo(:final mensaje):
        aviso = mensaje;
    }
    cargando = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _cerrado = true;
    super.dispose();
  }
}
