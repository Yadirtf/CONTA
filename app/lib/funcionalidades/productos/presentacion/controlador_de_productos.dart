import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../dominio/productos.dart';

/// Estado de la lista de productos (HU-05.02): lo que se escribe y lo encontrado. Al abrir trae los primeros;
/// al escribir espera a que la persona pare para no pedir una búsqueda por cada tecla.
class ControladorDeProductos extends ChangeNotifier {
  ControladorDeProductos(this._repositorio, this.empresaId, {this.espera = const Duration(milliseconds: 350)});

  final RepositorioDeProductos _repositorio;

  /// Negocio en el que se trabaja: viaja en X-Empresa en cada petición.
  final String empresaId;
  final Duration espera;

  String texto = '';
  bool cargando = false;
  String? aviso;
  List<Producto> productos = const [];

  Timer? _temporizador;
  int _turno = 0;

  Future<void> cargar() => _buscar(++_turno);

  void alEscribir(String nuevo) {
    texto = nuevo;
    _temporizador?.cancel();
    final turno = ++_turno;
    cargando = true;
    notifyListeners();
    _temporizador = Timer(espera, () => _buscar(turno));
  }

  /// Un producto recién creado aparece de una vez, sin volver a pedir la lista.
  void agregar(Producto producto) {
    productos = [producto, ...productos.where((p) => p.id != producto.id)];
    notifyListeners();
  }

  Future<void> _buscar(int turno) async {
    cargando = true;
    notifyListeners();
    final respuesta = await _repositorio.buscar(empresaId, texto);
    // Si mientras tanto escribió otra cosa, esta respuesta ya no sirve.
    if (turno != _turno) return;
    switch (respuesta) {
      case Exito(:final valor):
        productos = valor;
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
