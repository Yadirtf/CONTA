import 'package:material_ui/material_ui.dart';

import '../../../nucleo/id_nuevo.dart';
import '../dominio/clientes.dart';

/// Estado de «crear comprador» (HU-05.01). El id se elige una sola vez por formulario: si la señal se cae y la
/// persona vuelve a tocar «Guardar», la API reconoce el mismo id y no crea dos.
class ControladorDeCompradorNuevo extends ChangeNotifier {
  ControladorDeCompradorNuevo(this._repositorio, this.empresaId, {String Function() generarId = idNuevo})
    : id = generarId();

  final RepositorioDeClientes _repositorio;
  final String empresaId;
  final String id;

  bool ocupado = false;
  String? aviso;

  /// El comprador guardado (o el que ya existía con ese documento), o null y el aviso.
  Future<Comprador?> guardar({
    required TipoDeDocumento tipo,
    required String numero,
    required String nombre,
    required TipoDePersona tipoDePersona,
    required bool responsableDeIva,
    required String responsabilidades,
    required String correo,
  }) async {
    if (numero.trim().isEmpty || nombre.trim().isEmpty) {
      aviso = 'Escribe el documento y el nombre del comprador.';
      notifyListeners();
      return null;
    }
    ocupado = true;
    notifyListeners();
    final respuesta = await _repositorio.crear(
      empresaId,
      CompradorNuevo(
        id: id,
        tipoDeDocumento: tipo,
        numero: numero.trim(),
        nombre: nombre.trim(),
        tipoDePersona: tipoDePersona,
        responsableDeIva: tipo == TipoDeDocumento.nit && responsableDeIva,
        responsabilidadesFiscales: _responsabilidadesDe(responsabilidades),
        correo: correo.trim().isEmpty ? null : correo.trim(),
      ),
    );
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

  /// «O-13, O-15» → [O-13, O-15]. Vacío: la API pone R-99-PN (no responsable).
  static List<String> _responsabilidadesDe(String texto) =>
      texto.split(RegExp(r'[\s,;]+')).map((r) => r.trim().toUpperCase()).where((r) => r.isNotEmpty).toList();
}
