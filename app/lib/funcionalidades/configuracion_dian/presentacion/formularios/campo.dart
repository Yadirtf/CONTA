import 'package:material_ui/material_ui.dart';

import '../../../../nucleo/tema/tema_conta.dart';

/// Un campo de los formularios de configuración, con su espacio debajo. [secreto] para el PIN y la clave
/// técnica: se tapa, y el teclado no lo sugiere ni lo recuerda.
class Campo extends StatelessWidget {
  const Campo({
    super.key,
    required this.controlador,
    required this.etiqueta,
    this.ayuda,
    this.teclado = TextInputType.text,
    this.secreto = false,
    this.mayusculas = false,
    this.alCambiar,
  });

  final TextEditingController controlador;
  final String etiqueta;
  final String? ayuda;
  final TextInputType teclado;
  final bool secreto;
  final bool mayusculas;
  final ValueChanged<String>? alCambiar;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: EspacioConta.s3),
    child: TextField(
      controller: controlador,
      keyboardType: secreto ? TextInputType.visiblePassword : teclado,
      obscureText: secreto,
      autocorrect: !secreto,
      enableSuggestions: !secreto,
      textCapitalization: mayusculas ? TextCapitalization.characters : TextCapitalization.none,
      textInputAction: TextInputAction.next,
      onChanged: alCambiar,
      decoration: InputDecoration(labelText: etiqueta, helperText: ayuda, helperMaxLines: 2),
    ),
  );
}

/// «Datos que te dio la DIAN»: lo técnico, cerrado en modo simple y abierto en modo contador.
class DatosDeLaDian extends StatelessWidget {
  const DatosDeLaDian({super.key, required this.abierto, required this.campos});

  final bool abierto;
  final List<Widget> campos;

  @override
  Widget build(BuildContext context) => ExpansionTile(
    initiallyExpanded: abierto,
    tilePadding: EdgeInsets.zero,
    childrenPadding: const EdgeInsets.only(top: EspacioConta.s2),
    title: const Text('Datos que te dio la DIAN'),
    subtitle: const Text('Están en el correo y en el portal de habilitación'),
    children: campos,
  );
}

/// Texto escrito sin espacios a los lados; null si quedó vacío.
String? escrito(TextEditingController c) {
  final texto = c.text.trim();
  return texto.isEmpty ? null : texto;
}
