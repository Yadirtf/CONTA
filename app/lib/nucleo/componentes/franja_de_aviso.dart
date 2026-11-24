import 'package:material_ui/material_ui.dart';

import '../tema/tema_conta.dart';

/// Franja de error del sistema de diseño: fondo suave, ícono y palabra, nunca solo color (sección 2.3).
/// Se anuncia al lector de pantalla en cuanto aparece.
class FranjaDeAviso extends StatelessWidget {
  const FranjaDeAviso(this.texto, {super.key});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final paleta = context.paleta;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(EspacioConta.s3),
        decoration: BoxDecoration(color: paleta.errorFondo, borderRadius: BorderRadius.circular(RadioConta.campo)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.report_outlined, color: paleta.error),
            const SizedBox(width: EspacioConta.s2),
            Expanded(
              child: Text(texto, style: TextStyle(color: paleta.texto, fontSize: TextoConta.pequeno)),
            ),
          ],
        ),
      ),
    );
  }
}
