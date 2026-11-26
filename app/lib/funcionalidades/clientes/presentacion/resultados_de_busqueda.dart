import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/clientes.dart';
import 'controlador_de_busqueda.dart';
import 'tarjeta_de_comprador.dart';

/// Debajo del campo de búsqueda: el NIT con su dígito, los compradores encontrados y «Crear comprador».
class ResultadosDeBusqueda extends StatelessWidget {
  const ResultadosDeBusqueda({super.key, required this.controlador, required this.alElegir, required this.alCrear});

  final ControladorDeBusqueda controlador;
  final ValueChanged<Comprador> alElegir;
  final VoidCallback alCrear;

  @override
  Widget build(BuildContext context) {
    final c = controlador;
    if (!c.puedeBuscar) {
      return Text(
        'Escribe al menos ${ControladorDeBusqueda.minimoParaBuscar} números del documento.',
        style: TextStyle(color: context.paleta.textoSuave),
      );
    }
    if (c.buscando) return const Center(child: CircularProgressIndicator());
    final resultado = c.resultado;
    if (resultado == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (resultado.nit case final nit?) ...[
          Text('Si es NIT, con su dígito queda: $nit', style: const TextStyle(fontSize: TextoConta.subtitulo)),
          const SizedBox(height: EspacioConta.s3),
        ],
        if (resultado.compradores.isEmpty)
          Text('No hay compradores con ese documento.', style: TextStyle(color: context.paleta.textoSuave)),
        for (final comprador in resultado.compradores)
          TarjetaDeComprador(comprador: comprador, alElegir: () => alElegir(comprador)),
        const SizedBox(height: EspacioConta.s4),
        FilledButton.tonalIcon(onPressed: alCrear, icon: const Icon(Icons.person_add_alt), label: const Text('Crear comprador nuevo')),
      ],
    );
  }
}
