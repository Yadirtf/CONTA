import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'componentes/boton_principal.dart';
import 'controlador_de_acceso.dart';

/// Paso 1: el celular. Un campo y un botón; el teclado numérico se abre solo.
class PantallaCelular extends StatefulWidget {
  const PantallaCelular({super.key, required this.controlador});

  final ControladorDeAcceso controlador;

  @override
  State<PantallaCelular> createState() => _PantallaCelularState();
}

class _PantallaCelularState extends State<PantallaCelular> {
  late final _campo = TextEditingController(text: widget.controlador.celular);

  @override
  void dispose() {
    _campo.dispose();
    super.dispose();
  }

  void _pedir() => widget.controlador.pedirCodigo(_campo.text);

  @override
  Widget build(BuildContext context) {
    final c = widget.controlador;
    return MarcoDeFormulario(
      titulo: 'Entra con tu celular',
      explicacion: 'Te enviamos un código por WhatsApp. No necesitas contraseña.',
      contenido: [
        TextField(
          controller: _campo,
          autofocus: true,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumberNational],
          textInputAction: TextInputAction.send,
          onSubmitted: (_) => _pedir(),
          style: const TextStyle(fontSize: TextoConta.subtitulo),
          decoration: const InputDecoration(labelText: 'Tu celular', hintText: '300 123 4567', prefixText: '+57 '),
        ),
        if (c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(c.aviso!)],
      ],
      accionPrincipal: BotonPrincipal(texto: 'Enviarme el código', ocupado: c.ocupado, alTocar: _pedir),
    );
  }
}
