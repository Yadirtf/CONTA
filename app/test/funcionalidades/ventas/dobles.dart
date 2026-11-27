import 'dart:async';
import 'dart:typed_data';

import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/cola_de_comprobantes.dart';

/// API de ventas falsa: guarda los pedidos y responde como la real (mismo id, misma venta). El total lo
/// calcula aquí con los mismos centavos que la app: en la real lo pone el catálogo.
class RepositorioDeVentasFalso implements RepositorioDeVentas {
  final pedidos = <PedidoDeVenta>[];
  final consultas = <String>[];

  /// Respuestas de consultar, en orden; la última se repite.
  List<EstadoDeLaVenta> estados = [EstadoDeLaVenta.pendiente];

  /// HU-06.02: con qué sale una venta sin factura pedida (la API diría tiquete POS si el negocio lo tiene).
  DocumentoDeLaVenta documentoSinFactura = DocumentoDeLaVenta.factura;

  /// Si no es null, el próximo registro responde este rechazo.
  Rechazo<VentaEmitida>? rechazoAlRegistrar;

  /// Respuestas de comprobante, en orden; la última se repite (HU-06.08).
  List<Respuesta<Uint8List>> comprobantes = [Exito(pdfDePrueba)];
  final pedidosDeComprobante = <String>[];

  /// Respuesta de recientes (HU-06.08).
  Respuesta<List<VentaReciente>> respuestaDeRecientes = const Exito([]);

  final _porId = <String, VentaEmitida>{};
  var _consecutivo = 990000000;

  @override
  Future<Respuesta<VentaEmitida>> registrar(String empresaId, PedidoDeVenta pedido) async {
    pedidos.add(pedido);
    if (rechazoAlRegistrar case final rechazo?) {
      rechazoAlRegistrar = null;
      return rechazo;
    }
    final documento = pedido.conFactura ? DocumentoDeLaVenta.factura : documentoSinFactura;
    return Exito(
      _porId[pedido.id] ??= VentaEmitida(
        id: pedido.id,
        numero: '${documento == DocumentoDeLaVenta.pos ? 'EPOS' : 'SETP'}${_consecutivo++}',
        documento: documento,
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

  @override
  Future<Respuesta<List<VentaReciente>>> recientes(String empresaId) async => respuestaDeRecientes;

  @override
  Future<Respuesta<Uint8List>> comprobante(String empresaId, String ventaId) async {
    pedidosDeComprobante.add(ventaId);
    return comprobantes.length > 1 ? comprobantes.removeAt(0) : comprobantes.first;
  }
}

/// Un «PDF» mínimo: basta con que empiece como uno.
final pdfDePrueba = Uint8List.fromList('%PDF-1.3 prueba'.codeUnits);

/// Guarda lo que se compartió en lugar de abrir el menú del teléfono.
class CompartidorFalso implements CompartidorDeComprobantes {
  final compartidos = <ComprobanteParaCompartir>[];
  bool falla = false;

  @override
  Future<void> compartir(ComprobanteParaCompartir comprobante) async {
    if (falla) throw StateError('sin menú');
    compartidos.add(comprobante);
  }
}

/// Una cola que no espera de verdad entre reintentos.
ColaDeComprobantes colaDePrueba(RepositorioDeVentas api, CompartidorDeComprobantes compartidor) =>
    ColaDeComprobantes(api, compartidor, esperar: (_) async {});

const gaseosa = ArticuloEnVenta(id: 'p-gaseosa', nombre: 'Gaseosa 400 ml', precio: '2500.00');
const arroz = ArticuloEnVenta(id: 'p-arroz', nombre: 'Arroz 500 g', precio: '3200.50');

Future<Respuesta<List<ArticuloEnVenta>>> buscarFijo(String texto) async =>
    Exito([gaseosa, arroz].where((a) => a.nombre.toLowerCase().contains(texto.trim().toLowerCase())).toList());

/// Una cola cuyas esperas nunca terminan: deja ver el aviso de «en cola».
class ColaSinFin extends ColaDeComprobantes {
  ColaSinFin(RepositorioDeVentas api) : super(api, CompartidorFalso(), esperar: (_) => Completer<void>().future);
}
