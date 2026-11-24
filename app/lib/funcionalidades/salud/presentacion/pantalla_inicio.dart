import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/estado_api.dart';

class PantallaInicio extends StatelessWidget {
  const PantallaInicio({super.key, required this.repositorio, this.alSalir});

  final RepositorioSalud repositorio;

  /// Cerrar sesión. Llega desde la composición (app.dart): salud no conoce el acceso.
  final VoidCallback? alSalir;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CONTA'),
        actions: [
          if (alSalir != null) IconButton(onPressed: alSalir, tooltip: 'Salir', icon: const Icon(Icons.logout)),
        ],
      ),
      body: Center(
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
      ),
    );
  }
}
