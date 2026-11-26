import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/productos.dart';
import 'controlador_de_productos.dart';
import 'pantalla_producto_nuevo.dart';
import 'tarjeta_de_producto.dart';

/// Los productos del negocio (HU-05.02) con lo que se cobra y cuánto es IVA. Buscar por nombre o código.
/// «Producto nuevo» solo aparece si la membresía puede crearlos (dueño y contador); quien decide es la API.
class PantallaProductos extends StatefulWidget {
  const PantallaProductos({super.key, required this.repositorio, required this.empresaId, required this.puedeCrear});

  final RepositorioDeProductos repositorio;
  final String empresaId;
  final bool puedeCrear;

  @override
  State<PantallaProductos> createState() => _PantallaProductosState();
}

class _PantallaProductosState extends State<PantallaProductos> {
  late final _controlador = ControladorDeProductos(widget.repositorio, widget.empresaId)..cargar();

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  Future<void> _crear() async {
    final mensajero = ScaffoldMessenger.of(context);
    final creado = await Navigator.of(context).push<Producto>(
      MaterialPageRoute(
        builder: (_) => PantallaProductoNuevo(repositorio: widget.repositorio, empresaId: widget.empresaId),
      ),
    );
    if (creado == null) return;
    _controlador.agregar(creado);
    mensajero.showSnackBar(SnackBar(content: Text('Guardado: ${creado.nombre} a ${pesos(creado.precio.total)}')));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Productos')),
    floatingActionButton: widget.puedeCrear
        ? FloatingActionButton.extended(
            onPressed: _crear,
            icon: const Icon(Icons.add),
            label: const Text('Producto nuevo'),
          )
        : null,
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _controlador,
        builder: (context, _) {
          final c = _controlador;
          return ListView(
            padding: const EdgeInsets.all(EspacioConta.s4),
            children: [
              TextField(
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(
                  labelText: 'Buscar por nombre o código',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: c.alEscribir,
              ),
              const SizedBox(height: EspacioConta.s4),
              if (c.aviso != null) ...[FranjaDeAviso(c.aviso!), const SizedBox(height: EspacioConta.s4)],
              if (c.cargando && c.productos.isEmpty) const Center(child: CircularProgressIndicator()),
              if (!c.cargando && c.productos.isEmpty && c.aviso == null)
                Text(
                  c.texto.trim().isEmpty ? 'Todavía no hay productos.' : 'No hay productos con ese nombre o código.',
                  style: TextStyle(color: context.paleta.textoSuave),
                ),
              for (final producto in c.productos) TarjetaDeProducto(producto: producto),
              // Espacio para que el botón flotante no tape el último producto.
              const SizedBox(height: 88),
            ],
          );
        },
      ),
    ),
  );
}
