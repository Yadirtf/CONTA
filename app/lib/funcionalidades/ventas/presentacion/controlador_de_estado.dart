import 'package:material_ui/material_ui.dart';

import '../dominio/ventas.dart';

/// Sigue una venta hasta que la DIAN responde (HU-06.01). Pregunta cada vez más espaciado y después para: la
/// venta ya está guardada y la factura sigue en su cola aunque se cierre la pantalla.
class ControladorDeEstado extends ChangeNotifier {
  ControladorDeEstado(
    this._repositorio,
    this.empresaId,
    this.venta, {
    this.esperas = const [
      Duration(seconds: 2),
      Duration(seconds: 4),
      Duration(seconds: 8),
      Duration(seconds: 15),
      Duration(seconds: 30),
    ],
    this._esperar = Future<void>.delayed,
  });

  final RepositorioDeVentas _repositorio;
  final String empresaId;
  final List<Duration> esperas;
  final Future<void> Function(Duration) _esperar;

  VentaEmitida venta;

  /// true cuando se dejó de preguntar sin respuesta de la DIAN.
  bool sinRespuestaAun = false;
  bool _cerrado = false;

  Future<void> seguir() async {
    for (final espera in esperas) {
      if (venta.estado != EstadoDeLaVenta.pendiente) return;
      await _esperar(espera);
      if (_cerrado) return;
      final respuesta = await _repositorio.consultar(empresaId, venta.id);
      if (_cerrado) return;
      if (respuesta case Exito(:final valor)) {
        venta = valor;
        notifyListeners();
      }
    }
    if (venta.estado == EstadoDeLaVenta.pendiente) {
      sinRespuestaAun = true;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _cerrado = true;
    super.dispose();
  }
}
