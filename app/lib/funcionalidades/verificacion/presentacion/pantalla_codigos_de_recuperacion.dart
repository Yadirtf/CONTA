import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'controlador_de_verificacion.dart';

/// Los códigos de recuperación, una sola vez: sirven para entrar si se pierde el teléfono con la app.
class PantallaCodigosDeRecuperacion extends StatelessWidget {
  const PantallaCodigosDeRecuperacion({super.key, required this.controlador});

  final ControladorDeVerificacion controlador;

  @override
  Widget build(BuildContext context) {
    final codigos = controlador.codigosDeRecuperacion;
    return MarcoDeFormulario(
      titulo: 'Guarda estos códigos',
      explicacion:
          'Si pierdes el teléfono con la app de verificación, entra con uno de estos códigos. Cada uno sirve '
          'una sola vez. No los volverás a ver: guárdalos en un lugar seguro, lejos de este teléfono.',
      contenido: [
        Container(
          padding: const EdgeInsets.all(EspacioConta.s4),
          decoration: BoxDecoration(color: context.paleta.superficie, borderRadius: BorderRadius.circular(RadioConta.tarjeta)),
          child: SelectableText(
            codigos.join('\n'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: TextoConta.subtitulo, height: 1.6, letterSpacing: EspacioConta.s1),
          ),
        ),
        const SizedBox(height: EspacioConta.s4),
        OutlinedButton.icon(
          onPressed: () => Clipboard.setData(ClipboardData(text: codigos.join('\n'))),
          icon: const Icon(Icons.copy_outlined),
          label: const Text('Copiar los códigos'),
        ),
      ],
      accionPrincipal: BotonPrincipal(texto: 'Ya los guardé', ocupado: false, alTocar: controlador.codigosGuardados),
    );
  }
}
