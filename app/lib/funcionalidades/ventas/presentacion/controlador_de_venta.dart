import 'package:material_ui/material_ui.dart';

import '../../../nucleo/id_nuevo.dart';
import '../dominio/ventas.dart';

/// La venta en curso (HU-06.01): el carrito, cómo paga y a quién. Lo comparten «Vender» y «Cobrar».
/// El id del pedido se conserva mientras el pedido no cambie: si el envío falla y se vuelve a tocar «Confirmar»,
/// la API reconoce el mismo pedido y no crea otra venta ni gasta otro número.
class ControladorDeVenta extends ChangeNotifier {
  ControladorDeVenta(this._repositorio, this.empresaId, {this._nuevoId = idNuevo}) {
    _id = _nuevoId();
  }

  final RepositorioDeVentas _repositorio;
  final String empresaId;
  final String Function() _nuevoId;
  late String _id;

  Carrito carrito = const Carrito();
  MedioDePago medioDePago = MedioDePago.efectivo;
  CompradorDeLaVenta? comprador;
  bool enviando = false;
  String? aviso;

  void agregar(ArticuloEnVenta articulo) => _cambiarPedido(() => carrito = carrito.agregar(articulo));

  void cambiarCantidad(ArticuloEnVenta articulo, int cantidad) =>
      _cambiarPedido(() => carrito = carrito.cambiar(articulo, cantidad));

  void elegirMedio(MedioDePago medio) => _cambiarPedido(() => medioDePago = medio);

  /// null vuelve a consumidor final.
  void elegirComprador(CompradorDeLaVenta? elegido) => _cambiarPedido(() => comprador = elegido);

  /// Toque 3. Devuelve la venta guardada, o null con el aviso para la persona.
  Future<VentaEmitida?> confirmar() async {
    if (enviando || carrito.vacio) return null;
    enviando = true;
    aviso = null;
    notifyListeners();
    final pedido = PedidoDeVenta(id: _id, carrito: carrito, medioDePago: medioDePago, comprador: comprador);
    final respuesta = await _repositorio.registrar(empresaId, pedido);
    enviando = false;
    switch (respuesta) {
      case Exito(:final valor):
        _empezarOtra();
        notifyListeners();
        return valor;
      case Rechazo(:final codigo, :final mensaje):
        // Ese id ya es de otra venta (no debería pasar): el siguiente intento va con uno nuevo.
        if (codigo == 'venta.id-en-uso') _id = _nuevoId();
        aviso = mensaje;
        notifyListeners();
        return null;
    }
  }

  void _empezarOtra() {
    carrito = const Carrito();
    medioDePago = MedioDePago.efectivo;
    comprador = null;
    aviso = null;
    _id = _nuevoId();
  }

  void _cambiarPedido(void Function() cambio) {
    if (enviando) return;
    cambio();
    _id = _nuevoId();
    aviso = null;
    notifyListeners();
  }
}
