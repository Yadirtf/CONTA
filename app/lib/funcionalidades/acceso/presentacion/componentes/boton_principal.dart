import 'package:material_ui/material_ui.dart';

/// La única acción índigo de la pantalla. Ocupado, se desactiva para que dos toques no pidan dos veces.
class BotonPrincipal extends StatelessWidget {
  const BotonPrincipal({super.key, required this.texto, required this.ocupado, required this.alTocar});

  final String texto;
  final bool ocupado;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) => FilledButton(
        onPressed: ocupado ? null : alTocar,
        child: Text(ocupado ? 'Un momento…' : texto),
      );
}
