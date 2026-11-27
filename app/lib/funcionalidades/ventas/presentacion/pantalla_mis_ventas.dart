import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';
import 'cola_de_comprobantes.dart';
import 'controlador_de_mis_ventas.dart';
import 'fila_de_venta.dart';

/// «Mis ventas» (HU-06.08): las últimas facturas, cada una con «Compartir». Se recarga deslizando hacia abajo.
class PantallaMisVentas extends StatefulWidget {
  const PantallaMisVentas({super.key, required this.repositorio, required this.empresaId, required this.cola});

  final RepositorioDeVentas repositorio;
  final String empresaId;
  final ColaDeComprobantes cola;

  @override
  State<PantallaMisVentas> createState() => _PantallaMisVentasState();
}

class _PantallaMisVentasState extends State<PantallaMisVentas> {
  late final _ventas = ControladorDeMisVentas(widget.repositorio, widget.empresaId)..cargar();

  @override
  void dispose() {
    _ventas.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Mis ventas')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _ventas,
        builder: (context, _) {
          final v = _ventas;
          return RefreshIndicator(
            onRefresh: v.cargar,
            child: ListView(
              padding: const EdgeInsets.all(EspacioConta.s4),
              children: [
                if (v.aviso != null) ...[FranjaDeAviso(v.aviso!), const SizedBox(height: EspacioConta.s4)],
                if (v.cargando && v.ventas.isEmpty) const Center(child: CircularProgressIndicator()),
                if (!v.cargando && v.ventas.isEmpty && v.aviso == null)
                  Text('Todavía no hay ventas.', style: TextStyle(color: context.paleta.textoSuave)),
                for (final venta in v.ventas)
                  FilaDeVenta(venta: venta, cola: widget.cola, empresaId: widget.empresaId),
              ],
            ),
          );
        },
      ),
    ),
  );
}
