import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';

/// API de ventas falsa: guarda los pedidos y responde como la real (mismo id, misma venta). El total lo
/// calcula aquí con los mismos centavos que la app: en la real lo pone el catálogo.
class RepositorioDeVentasFalso implements RepositorioDeVentas {
  final pedidos = <PedidoDeVenta>[];
  final consultas = <String>[];

  /// Respuestas de consultar, en orden; la última se repite.
  List<EstadoDeLaVenta> estados = [EstadoDeLaVenta.pendiente];

  /// Si no es null, el próximo registro responde este rechazo.
  Rechazo<VentaEmitida>? rechazoAlRegistrar;

  final _porId = <String, VentaEmitida>{};
  var _consecutivo = 990000000;

  @override
  Future<Respuesta<VentaEmitida>> registrar(String empresaId, PedidoDeVenta pedido) async {
    pedidos.add(pedido);
    if (rechazoAlRegistrar case final rechazo?) {
      rechazoAlRegistrar = null;
      return rechazo;
    }
    return Exito(
      _porId[pedido.id] ??= VentaEmitida(
        id: pedido.id,
        numero: 'SETP${_consecutivo++}',
        comprador: pedido.comprador?.nombre ?? 'Consumidor final',
        total: pedido.carrito.total,
        iva: '0.00',
        estado: EstadoDeLaVenta.pendiente,
        mensaje: 'Guardada. Se está enviando a la DIAN.',
      ),
    );
  }

  @override
  Future<Respuesta<VentaEmitida>> consultar(String empresaId, String ventaId) async {
    consultas.add(ventaId);
    final venta = _porId[ventaId];
    if (venta == null) return const Rechazo('venta.no-encontrada', 'No encontramos esa venta');
    final estado = estados.length > 1 ? estados.removeAt(0) : estados.first;
    return Exito(
      VentaEmitida(
        id: venta.id,
        numero: venta.numero,
        comprador: venta.comprador,
        total: venta.total,
        iva: venta.iva,
        estado: estado,
        mensaje: switch (estado) {
          EstadoDeLaVenta.pendiente => 'Guardada. Se está enviando a la DIAN.',
          EstadoDeLaVenta.aceptada => 'La DIAN la aprobó.',
          EstadoDeLaVenta.rechazada => 'La DIAN no la aceptó.',
        },
        motivos: estado == EstadoDeLaVenta.rechazada ? const ['Regla FAD06: valor del tributo'] : const [],
      ),
    );
  }
}

const gaseosa = ArticuloEnVenta(id: 'p-gaseosa', nombre: 'Gaseosa 400 ml', precio: '2500.00');
const arroz = ArticuloEnVenta(id: 'p-arroz', nombre: 'Arroz 500 g', precio: '3200.50');

Future<Respuesta<List<ArticuloEnVenta>>> buscarFijo(String texto) async =>
    Exito([gaseosa, arroz].where((a) => a.nombre.toLowerCase().contains(texto.trim().toLowerCase())).toList());
