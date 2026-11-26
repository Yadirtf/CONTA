import 'package:material_ui/material_ui.dart';

import '../../../nucleo/id_nuevo.dart';
import '../dominio/productos.dart';

/// Estado de «crear producto» (HU-05.02). El id se elige una sola vez por formulario: si la señal se cae y la
/// persona vuelve a tocar «Guardar», la API reconoce el mismo id y no crea dos.
class ControladorDeProductoNuevo extends ChangeNotifier {
  ControladorDeProductoNuevo(this._repositorio, this.empresaId, {String Function() generarId = idNuevo})
    : id = generarId();

  final RepositorioDeProductos _repositorio;
  final String empresaId;
  final String id;

  bool ocupado = false;
  String? aviso;

  /// El producto guardado, con su precio ya separado por la API, o null y el aviso.
  Future<Producto?> guardar({
    required String nombre,
    required String precio,
    required bool precioIncluyeIva,
    required IvaDelProducto iva,
    required UnidadDeMedida unidad,
    required String codigo,
  }) async {
    final paraLaApi = precioParaLaApi(precio);
    if (nombre.trim().isEmpty) return _avisar('Escribe el nombre del producto.');
    if (paraLaApi == null) return _avisar('Escribe el precio en pesos, por ejemplo 2.500 o 2.500,50.');
    ocupado = true;
    notifyListeners();
    final respuesta = await _repositorio.crear(
      empresaId,
      ProductoNuevo(
        id: id,
        nombre: nombre.trim(),
        precio: paraLaApi,
        // Exentos y excluidos no cobran IVA: con o sin él es el mismo precio.
        precioIncluyeIva: precioIncluyeIva || !iva.cobraIva,
        iva: iva,
        unidad: unidad,
        codigo: codigo.trim().isEmpty ? null : codigo.trim(),
      ),
    );
    ocupado = false;
    switch (respuesta) {
      case Exito(:final valor):
        aviso = null;
        notifyListeners();
        return valor;
      case Rechazo(:final mensaje):
        return _avisar(mensaje);
    }
  }

  Producto? _avisar(String mensaje) {
    aviso = mensaje;
    notifyListeners();
    return null;
  }
}
