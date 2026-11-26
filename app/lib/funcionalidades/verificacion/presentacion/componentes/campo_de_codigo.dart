import 'package:material_ui/material_ui.dart';

import '../../../../nucleo/tema/tema_conta.dart';

/// Campo para el código de la app de verificación. Con los 6 números envía solo, sin otro toque.
/// Si [aceptaRecuperacion], también recibe un código de recuperación (ABCDE-FGHJK) y entonces no envía solo.
class CampoDeCodigo extends StatelessWidget {
  const CampoDeCodigo({
    super.key,
    required this.controlador,
    required this.alCompletar,
    required this.ocupado,
    this.aceptaRecuperacion = false,
  });

  final TextEditingController controlador;
  final VoidCallback alCompletar;
  final bool ocupado;
  final bool aceptaRecuperacion;

  @override
  Widget build(BuildContext context) => TextField(
    controller: controlador,
    autofocus: true,
    keyboardType: aceptaRecuperacion ? TextInputType.visiblePassword : TextInputType.number,
    autofillHints: const [AutofillHints.oneTimeCode],
    maxLength: aceptaRecuperacion ? 11 : 6,
    textAlign: TextAlign.center,
    textCapitalization: TextCapitalization.characters,
    style: const TextStyle(fontSize: TextoConta.monto, letterSpacing: EspacioConta.s2),
    decoration: InputDecoration(
      labelText: aceptaRecuperacion ? 'Código de 6 números o de recuperación' : 'Código de 6 números',
      counterText: '',
    ),
    onChanged: (texto) {
      if (RegExp(r'^\d{6}$').hasMatch(texto) && !ocupado) alCompletar();
    },
    onSubmitted: (_) => alCompletar(),
  );
}
