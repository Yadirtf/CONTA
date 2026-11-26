import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/celular.dart';
import '../../../nucleo/componentes/boton_principal.dart';
import 'componentes/boton_otro_codigo.dart';
import 'controlador_de_acceso.dart';

/// Paso 2: el código de 6 números. Al completar el sexto número entra solo, sin otro toque.
class PantallaCodigo extends StatefulWidget {
  const PantallaCodigo({super.key, required this.controlador});

  final ControladorDeAcceso controlador;

  @override
  State<PantallaCodigo> createState() => _PantallaCodigoState();
}

class _PantallaCodigoState extends State<PantallaCodigo> {
  final _campo = TextEditingController();

  @override
  void dispose() {
    _campo.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    await widget.controlador.entrar(_campo.text);
    if (mounted && widget.controlador.aviso != null) _campo.clear();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controlador;
    return MarcoDeFormulario(
      titulo: 'Escribe el código',
      explicacion: 'Lo enviamos por WhatsApp al ${celularLegible(c.celular)}. Vence en 10 minutos.',
      contenido: [
        TextField(
          controller: _campo,
          autofocus: true,
          keyboardType: TextInputType.number,
          autofillHints: const [AutofillHints.oneTimeCode],
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: TextoConta.monto, letterSpacing: EspacioConta.s2),
          decoration: const InputDecoration(labelText: 'Código de 6 números', counterText: ''),
          onChanged: (texto) {
            if (texto.length == 6 && !c.ocupado) _entrar();
          },
        ),
        if (c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(c.aviso!)],
        const SizedBox(height: EspacioConta.s4),
        BotonOtroCodigo(desde: c.otroCodigoDesde, alTocar: () => c.pedirCodigo(c.celular)),
        TextButton(onPressed: c.cambiarCelular, child: const Text('Cambiar el número')),
      ],
      accionPrincipal: BotonPrincipal(texto: 'Entrar', ocupado: c.ocupado, alTocar: _entrar),
    );
  }
}
