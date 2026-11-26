import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'componentes/campo_de_codigo.dart';
import 'controlador_de_verificacion.dart';

/// Cada sesión nueva (y cada jornada): el código de la app de verificación o uno de recuperación.
class PantallaVerificar extends StatefulWidget {
  const PantallaVerificar({super.key, required this.controlador, required this.alCancelar});

  final ControladorDeVerificacion controlador;
  final VoidCallback alCancelar;

  @override
  State<PantallaVerificar> createState() => _PantallaVerificarState();
}

class _PantallaVerificarState extends State<PantallaVerificar> {
  final _campo = TextEditingController();
  bool _conRecuperacion = false;

  @override
  void dispose() {
    _campo.dispose();
    super.dispose();
  }

  Future<void> _verificar() async {
    await widget.controlador.verificar(_campo.text);
    if (mounted && widget.controlador.aviso != null) _campo.clear();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controlador;
    return MarcoDeFormulario(
      titulo: 'Confirma que eres tú',
      explicacion: _conRecuperacion
          ? 'Escribe uno de tus códigos de recuperación. Ese código ya no servirá otra vez.'
          : 'Abre tu app de verificación y escribe los 6 números de CONTA.',
      contenido: [
        CampoDeCodigo(
          key: ValueKey(_conRecuperacion),
          controlador: _campo,
          ocupado: c.ocupado,
          alCompletar: _verificar,
          aceptaRecuperacion: _conRecuperacion,
        ),
        if (c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(c.aviso!)],
        const SizedBox(height: EspacioConta.s4),
        if (!_conRecuperacion)
          TextButton(
            onPressed: () => setState(() {
              _conRecuperacion = true;
              _campo.clear();
            }),
            child: const Text('Perdí el teléfono: usar un código de recuperación'),
          ),
        TextButton(onPressed: widget.alCancelar, child: const Text('Ahora no')),
      ],
      accionPrincipal: BotonPrincipal(texto: 'Confirmar', ocupado: c.ocupado, alTocar: _verificar),
    );
  }
}
