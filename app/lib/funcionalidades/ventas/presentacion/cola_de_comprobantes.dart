import 'package:material_ui/material_ui.dart';

import '../dominio/ventas.dart';
import 'estado_de_compartir.dart';

/// Comparte facturas en un toque (HU-06.08). Si no hay internet o la DIAN aún no la aprueba, la deja en cola y la
/// vuelve a pedir cada vez más espaciado mientras la app esté abierta; cuando llega, abre el menú de compartir.
/// Vive en la composición, no en una pantalla: la cola sigue aunque se salga de «Listo» o de «Mis ventas».
class ColaDeComprobantes extends ChangeNotifier {
  ColaDeComprobantes(
    this._repositorio,
    this._compartidor, {
    this.esperas = const [
      Duration(seconds: 5),
      Duration(seconds: 15),
      Duration(seconds: 30),
      Duration(minutes: 1),
      Duration(minutes: 2),
      Duration(minutes: 5),
      Duration(minutes: 10),
    ],
    Future<void> Function(Duration)? esperar,
  }) : _esperar = esperar ?? Future<void>.delayed;

  final RepositorioDeVentas _repositorio;
  final CompartidorDeComprobantes _compartidor;

  /// Una espera por reintento; acabadas, se deja de intentar y se avisa.
  final List<Duration> esperas;
  final Future<void> Function(Duration) _esperar;

  /// Como mucho estas facturas esperando a la vez: nadie deja cientos de descargas dando vueltas.
  static const maximoEnCola = 10;

  final _estados = <String, EstadoDeCompartir>{};
  bool _cerrada = false;

  EstadoDeCompartir? estadoDe(String ventaId) => _estados[ventaId];

  /// Pide el PDF y lo comparte. Un segundo toque mientras se descarga o espera no hace nada más.
  Future<void> compartir(String empresaId, String ventaId, String numero) async {
    final actual = _estados[ventaId];
    if (actual != null && actual.ocupado) return;
    if (_estados.values.where((e) => e.ocupado).length >= maximoEnCola) {
      return _poner(ventaId, const EstadoDeCompartir.fallo('Hay muchas facturas esperando. Intenta en un rato.'));
    }
    _poner(ventaId, const EstadoDeCompartir.descargando());
    for (var intento = 0; ; intento++) {
      final respuesta = await _repositorio.comprobante(empresaId, ventaId);
      if (_cerrada) return;
      switch (respuesta) {
        case Exito(:final valor):
          return _entregar(ventaId, ComprobanteParaCompartir(numero: numero, pdf: valor));
        case Rechazo(:final codigo, :final mensaje):
          final enCola = EstadoDeCompartir.enColaPor(codigo);
          if (enCola == null) return _poner(ventaId, EstadoDeCompartir.fallo(mensaje));
          if (intento >= esperas.length) {
            return _poner(ventaId, const EstadoDeCompartir.fallo('No pudimos traer la factura. Intenta otra vez.'));
          }
          _poner(ventaId, enCola);
          await _esperar(esperas[intento]);
          if (_cerrada) return;
      }
    }
  }

  Future<void> _entregar(String ventaId, ComprobanteParaCompartir comprobante) async {
    try {
      await _compartidor.compartir(comprobante);
      _estados.remove(ventaId);
      if (!_cerrada) notifyListeners();
    } on Object {
      _poner(ventaId, const EstadoDeCompartir.fallo('El teléfono no pudo abrir para compartir. Intenta otra vez.'));
    }
  }

  void _poner(String ventaId, EstadoDeCompartir estado) {
    if (_cerrada) return;
    _estados[ventaId] = estado;
    notifyListeners();
  }

  @override
  void dispose() {
    _cerrada = true;
    super.dispose();
  }
}
