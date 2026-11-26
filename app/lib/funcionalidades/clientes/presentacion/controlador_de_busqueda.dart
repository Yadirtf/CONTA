import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../dominio/clientes.dart';

/// Estado de «buscar al comprador» (HU-05.01): lo que se escribe, el dígito del NIT y lo encontrado.
/// Espera a que la persona deje de escribir para no pedir una búsqueda por cada tecla.
class ControladorDeBusqueda extends ChangeNotifier {
  ControladorDeBusqueda(this._repositorio, this.empresaId, {this.espera = const Duration(milliseconds: 350)});

  final RepositorioDeClientes _repositorio;

  /// Negocio en el que se trabaja: viaja en X-Empresa en cada petición.
  final String empresaId;
  final Duration espera;

  /// Lo mismo que pide la API: con menos, no se busca.
  static const minimoParaBuscar = 3;

  String texto = '';
  bool buscando = false;
  bool ocupado = false;
  String? aviso;
  ResultadoDeBusqueda? resultado;

  Timer? _temporizador;
  int _turno = 0;

  /// Sin puntos, espacios ni lo que va después del guion, como lo limpia la API.
  String get documentoLimpio => texto.replaceAll(RegExp(r'[\s.,]'), '').split('-').first.toUpperCase();

  bool get puedeBuscar => documentoLimpio.length >= minimoParaBuscar;

  void alEscribir(String nuevo) {
    texto = nuevo;
    _temporizador?.cancel();
    _turno++;
    if (!puedeBuscar) {
      resultado = null;
      buscando = false;
      aviso = null;
      notifyListeners();
      return;
    }
    buscando = true;
    notifyListeners();
    _temporizador = Timer(espera, () => _buscar(_turno));
  }

  /// Vuelve a buscar ya, sin esperar (por ejemplo, después de crear un comprador).
  Future<void> buscarAhora() async {
    _temporizador?.cancel();
    if (puedeBuscar) await _buscar(++_turno);
  }

  Future<void> _buscar(int turno) async {
    final respuesta = await _repositorio.buscar(empresaId, documentoLimpio);
    // Si mientras tanto escribió otra cosa, esta respuesta ya no sirve.
    if (turno != _turno) return;
    switch (respuesta) {
      case Exito(:final valor):
        resultado = valor;
        aviso = null;
      case Rechazo(:final mensaje):
        resultado = null;
        aviso = mensaje;
    }
    buscando = false;
    notifyListeners();
  }

  /// El comprador genérico, o null y el aviso si la API no respondió.
  Future<Comprador?> consumidorFinal() async {
    ocupado = true;
    notifyListeners();
    final respuesta = await _repositorio.consumidorFinal(empresaId);
    ocupado = false;
    switch (respuesta) {
      case Exito(:final valor):
        aviso = null;
        notifyListeners();
        return valor;
      case Rechazo(:final mensaje):
        aviso = mensaje;
        notifyListeners();
        return null;
    }
  }

  @override
  void dispose() {
    _temporizador?.cancel();
    super.dispose();
  }
}
