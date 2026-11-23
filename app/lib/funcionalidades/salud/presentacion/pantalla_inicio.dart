import 'package:material_ui/material_ui.dart';

import '../dominio/estado_api.dart';

class PantallaInicio extends StatelessWidget {
  const PantallaInicio({super.key, required this.repositorio});

  final RepositorioSalud repositorio;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CONTA')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: FutureBuilder<EstadoApi>(
            future: repositorio.consultar(),
            builder: (context, foto) {
              final texto = foto.hasData ? mensajeDeEstado(foto.data!) : 'Conectando…';
              return Text(texto, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium);
            },
          ),
        ),
      ),
    );
  }
}
