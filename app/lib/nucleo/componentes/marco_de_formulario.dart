import 'package:material_ui/material_ui.dart';

import '../tema/tema_conta.dart';

/// Pantalla de un solo paso: título, explicación corta, contenido y la acción principal abajo y a lo ancho
/// (sistema de diseño, sección 5: una acción índigo por pantalla, al alcance del pulgar).
class MarcoDeFormulario extends StatelessWidget {
  const MarcoDeFormulario({
    super.key,
    required this.titulo,
    required this.explicacion,
    required this.contenido,
    required this.accionPrincipal,
  });

  final String titulo;
  final String explicacion;
  final List<Widget> contenido;
  final Widget accionPrincipal;

  @override
  Widget build(BuildContext context) {
    final textos = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('CONTA')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(EspacioConta.s4),
                children: [
                  Text(titulo, style: textos.headlineSmall?.copyWith(fontSize: TextoConta.titulo)),
                  const SizedBox(height: EspacioConta.s2),
                  Text(explicacion, style: textos.bodyLarge?.copyWith(color: context.paleta.textoSuave)),
                  const SizedBox(height: EspacioConta.s6),
                  ...contenido,
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(EspacioConta.s4),
              child: SizedBox(width: double.infinity, child: accionPrincipal),
            ),
          ],
        ),
      ),
    );
  }
}
