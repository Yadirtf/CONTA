import 'package:material_ui/material_ui.dart';

import 'controlador_de_acceso.dart';
import 'pantalla_celular.dart';
import 'pantalla_codigo.dart';

/// Muestra el paso del acceso o, con sesión, lo de adentro. Nada de la app se ve sin sesión.
class PuertaDeAcceso extends StatefulWidget {
  const PuertaDeAcceso({super.key, required this.controlador, required this.adentro});

  final ControladorDeAcceso controlador;
  final WidgetBuilder adentro;

  @override
  State<PuertaDeAcceso> createState() => _PuertaDeAccesoState();
}

class _PuertaDeAccesoState extends State<PuertaDeAcceso> {
  @override
  void initState() {
    super.initState();
    widget.controlador.iniciar();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: widget.controlador,
        builder: (context, _) => switch (widget.controlador.paso) {
          PasoDeAcceso.cargando => const Scaffold(body: Center(child: CircularProgressIndicator())),
          PasoDeAcceso.celular => PantallaCelular(controlador: widget.controlador),
          PasoDeAcceso.codigo => PantallaCodigo(controlador: widget.controlador),
          PasoDeAcceso.adentro => widget.adentro(context),
        },
      );
}
