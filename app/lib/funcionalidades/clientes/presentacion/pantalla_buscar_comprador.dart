import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/clientes.dart';
import 'controlador_de_busqueda.dart';
import 'pantalla_comprador_nuevo.dart';
import 'resultados_de_busqueda.dart';

/// ¿A quién se le vende? (HU-05.01). Arriba, «Consumidor final» en un toque; debajo, buscar por cédula o NIT.
/// Al elegir, la pantalla se cierra y devuelve el comprador a quien la abrió.
class PantallaBuscarComprador extends StatefulWidget {
  const PantallaBuscarComprador({super.key, required this.repositorio, required this.empresaId});

  final RepositorioDeClientes repositorio;
  final String empresaId;

  @override
  State<PantallaBuscarComprador> createState() => _PantallaBuscarCompradorState();
}

class _PantallaBuscarCompradorState extends State<PantallaBuscarComprador> {
  late final _controlador = ControladorDeBusqueda(widget.repositorio, widget.empresaId);

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  void _elegir(Comprador comprador) => Navigator.of(context).pop(comprador);

  Future<void> _consumidorFinal() async {
    final comprador = await _controlador.consumidorFinal();
    if (comprador != null && mounted) _elegir(comprador);
  }

  Future<void> _crear() async {
    final creado = await Navigator.of(context).push<Comprador>(
      MaterialPageRoute(
        builder: (_) => PantallaCompradorNuevo(
          repositorio: widget.repositorio,
          empresaId: widget.empresaId,
          numeroInicial: _controlador.documentoLimpio,
        ),
      ),
    );
    if (creado != null && mounted) _elegir(creado);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('¿A quién le vendes?')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _controlador,
        builder: (context, _) {
          final c = _controlador;
          return ListView(
            padding: const EdgeInsets.all(EspacioConta.s4),
            children: [
              OutlinedButton.icon(
                onPressed: c.ocupado ? null : _consumidorFinal,
                icon: const Icon(Icons.person_off_outlined),
                label: const Text('Consumidor final (sin datos)'),
              ),
              const SizedBox(height: EspacioConta.s6),
              TextField(
                autofocus: true,
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.search,
                style: const TextStyle(fontSize: TextoConta.subtitulo),
                decoration: const InputDecoration(labelText: 'Cédula o NIT del comprador', hintText: '1020304050'),
                onChanged: c.alEscribir,
              ),
              const SizedBox(height: EspacioConta.s4),
              if (c.aviso != null) ...[FranjaDeAviso(c.aviso!), const SizedBox(height: EspacioConta.s4)],
              ResultadosDeBusqueda(controlador: c, alElegir: _elegir, alCrear: _crear),
            ],
          );
        },
      ),
    ),
  );
}
