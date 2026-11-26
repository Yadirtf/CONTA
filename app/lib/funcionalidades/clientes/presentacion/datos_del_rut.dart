import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';

/// Lo del RUT del comprador, plegado: si no se toca, queda «no responsable» (R-99-PN), que es lo más común.
class DatosDelRut extends StatelessWidget {
  const DatosDelRut({
    super.key,
    required this.esNit,
    required this.responsabilidades,
    required this.responsableDeIva,
    required this.alCambiarIva,
  });

  final bool esNit;
  final TextEditingController responsabilidades;
  final bool responsableDeIva;
  final ValueChanged<bool> alCambiarIva;

  @override
  Widget build(BuildContext context) => ExpansionTile(
    tilePadding: EdgeInsets.zero,
    title: const Text('Datos del RUT (opcional)'),
    subtitle: Text('Solo si el comprador te los pide en la factura.', style: TextStyle(color: context.paleta.textoSuave)),
    children: [
      if (esNit)
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Es responsable de IVA'),
          value: responsableDeIva,
          onChanged: alCambiarIva,
        ),
      TextField(
        controller: responsabilidades,
        textCapitalization: TextCapitalization.characters,
        decoration: const InputDecoration(labelText: 'Responsabilidades del RUT', hintText: 'O-13, O-15'),
      ),
      const SizedBox(height: EspacioConta.s3),
    ],
  );
}
