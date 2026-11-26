import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/productos.dart';

/// ¿Cobra IVA? Las cuatro opciones de la ley con ejemplos de la calle, para no tener que saber de impuestos.
class SelectorDeIva extends StatelessWidget {
  const SelectorDeIva({super.key, required this.elegido, required this.alElegir});

  final IvaDelProducto elegido;
  final ValueChanged<IvaDelProducto> alElegir;

  @override
  Widget build(BuildContext context) => RadioGroup<IvaDelProducto>(
    groupValue: elegido,
    onChanged: (iva) => iva == null ? null : alElegir(iva),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final iva in IvaDelProducto.values)
          RadioListTile<IvaDelProducto>(
            value: iva,
            contentPadding: EdgeInsets.zero,
            title: Text(iva.nombre),
            subtitle: Text(iva.ejemplos, style: TextStyle(color: context.paleta.textoSuave)),
          ),
        Text('Si no estás seguro, pregúntale a tu contador.', style: TextStyle(color: context.paleta.textoSuave)),
      ],
    ),
  );
}
