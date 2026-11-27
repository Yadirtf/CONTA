import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../dominio/ventas.dart';

/// Lo que se puede vender, con búsqueda. Al abrir trae los primeros; al escribir espera a que la persona pare.
class ControladorDeArticulos extends ChangeNotifier {
  ControladorDeArticulos(this._buscar, {this.espera = const Duration(milliseconds: 350)});

  final BuscarArticulos _buscar;
  final Duration espera;

  String texto = '';
  bool cargando = false;
  String? aviso;
  List<ArticuloEnVenta> articulos = const [];

  Timer? _temporizador;
  int _turno = 0;

  Future<void> cargar() => _traer(++_turno);

  void alEscribir(String nuevo) {
    texto = nuevo;
    _temporizador?.cancel();
    final turno = ++_turno;
    cargando = true;
    notifyListeners();
    _temporizador = Timer(espera, () => _traer(turno));
  }

  Future<void> _traer(int turno) async {
    cargando = true;
    notifyListeners();
    final respuesta = await _buscar(texto);
    if (turno != _turno) return;
    switch (respuesta) {
      case Exito(:final valor):
        articulos = valor;
        aviso = null;
      case Rechazo(:final mensaje):
        aviso = mensaje;
    }
    cargando = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _temporizador?.cancel();
    super.dispose();
  }
}
