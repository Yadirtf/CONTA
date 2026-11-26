import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/estado_api.dart';

/// Dice si el servidor responde. Es lo único que hay adentro por ahora; la pantalla que lo rodea la pone app.dart.
class EstadoDelServidor extends StatelessWidget {
  const EstadoDelServidor({super.key, required this.repositorio});

  final RepositorioSalud repositorio;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(EspacioConta.s6),
      child: FutureBuilder<EstadoApi>(
        future: repositorio.consultar(),
        builder: (context, foto) {
          final texto = foto.hasData ? mensajeDeEstado(foto.data!) : 'Conectando…';
          return Text(texto, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium);
        },
      ),
    ),
  );
}
