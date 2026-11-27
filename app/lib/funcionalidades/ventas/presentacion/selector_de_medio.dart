import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';

/// Cómo paga: efectivo ya viene marcado, así que no cuesta un toque más.
class SelectorDeMedio extends StatelessWidget {
  const SelectorDeMedio({super.key, required this.elegido, required this.alElegir});

  final MedioDePago elegido;
  final ValueChanged<MedioDePago> alElegir;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: EspacioConta.s2,
    runSpacing: EspacioConta.s2,
    children: [
      for (final medio in MedioDePago.values)
        ChoiceChip(label: Text(medio.nombre), selected: medio == elegido, onSelected: (_) => alElegir(medio)),
    ],
  );
}
