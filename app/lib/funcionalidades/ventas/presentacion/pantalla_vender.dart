import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';
import 'barra_de_cobro.dart';
import 'cola_de_comprobantes.dart';
import 'controlador_de_articulos.dart';
import 'controlador_de_venta.dart';
import 'pantalla_cobrar.dart';
import 'tarjeta_para_vender.dart';

/// Toque 1 de la venta (HU-06.01): tocar los productos. Abajo, «Cobrar» con el total lleva al toque 2.
class PantallaVender extends StatefulWidget {
  const PantallaVender({
    super.key,
    required this.repositorio,
    required this.empresaId,
    required this.buscarArticulos,
    required this.cola,
    this.elegirComprador,
  });

  final RepositorioDeVentas repositorio;
  final String empresaId;
  final BuscarArticulos buscarArticulos;

  /// Comparte las facturas desde «Listo» (HU-06.08).
  final ColaDeComprobantes cola;

  /// Abre la búsqueda de compradores (HU-05.01). Llega desde la composición: ventas no conoce sus datos.
  final Future<CompradorDeLaVenta?> Function(BuildContext contexto)? elegirComprador;

  @override
  State<PantallaVender> createState() => _PantallaVenderState();
}

class _PantallaVenderState extends State<PantallaVender> {
  late final _venta = ControladorDeVenta(widget.repositorio, widget.empresaId);
  late final _articulos = ControladorDeArticulos(widget.buscarArticulos)..cargar();

  @override
  void dispose() {
    _venta.dispose();
    _articulos.dispose();
    super.dispose();
  }

  void _cobrar() => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => PantallaCobrar(
        venta: _venta,
        repositorio: widget.repositorio,
        cola: widget.cola,
        elegirComprador: widget.elegirComprador,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Vender')),
    bottomNavigationBar: ListenableBuilder(
      listenable: _venta,
      builder: (_, _) => BarraDeCobro(carrito: _venta.carrito, alCobrar: _cobrar),
    ),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: Listenable.merge([_venta, _articulos]),
        builder: (context, _) {
          final a = _articulos;
          return ListView(
            padding: const EdgeInsets.all(EspacioConta.s4),
            children: [
              TextField(
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(labelText: 'Buscar producto', prefixIcon: Icon(Icons.search)),
                onChanged: a.alEscribir,
              ),
              const SizedBox(height: EspacioConta.s4),
              if (a.aviso != null) ...[FranjaDeAviso(a.aviso!), const SizedBox(height: EspacioConta.s4)],
              if (a.cargando && a.articulos.isEmpty) const Center(child: CircularProgressIndicator()),
              if (!a.cargando && a.articulos.isEmpty && a.aviso == null)
                Text(
                  a.texto.trim().isEmpty ? 'Todavía no hay productos para vender.' : 'No hay productos con ese nombre.',
                  style: TextStyle(color: context.paleta.textoSuave),
                ),
              for (final articulo in a.articulos)
                TarjetaParaVender(
                  articulo: articulo,
                  cantidad: _venta.carrito.cantidadDe(articulo.id),
                  alTocar: () => _venta.agregar(articulo),
                ),
            ],
          );
        },
      ),
    ),
  );
}
