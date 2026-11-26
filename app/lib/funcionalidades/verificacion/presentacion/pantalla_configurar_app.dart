import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'componentes/campo_de_codigo.dart';
import 'componentes/codigo_qr.dart';
import 'controlador_de_verificacion.dart';

/// Primera vez: configurar la app de verificación con el QR o la clave, y confirmarla con su primer código.
class PantallaConfigurarApp extends StatefulWidget {
  const PantallaConfigurarApp({super.key, required this.controlador, required this.alCancelar});

  final ControladorDeVerificacion controlador;
  final VoidCallback alCancelar;

  @override
  State<PantallaConfigurarApp> createState() => _PantallaConfigurarAppState();
}

class _PantallaConfigurarAppState extends State<PantallaConfigurarApp> {
  final _campo = TextEditingController();

  @override
  void dispose() {
    _campo.dispose();
    super.dispose();
  }

  Future<void> _confirmar() async {
    await widget.controlador.confirmar(_campo.text);
    if (mounted && widget.controlador.aviso != null) _campo.clear();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controlador;
    final app = c.app!;
    return MarcoDeFormulario(
      titulo: 'Protege tu trabajo de contador',
      explicacion:
          'Para entrar como contador, CONTA pide un segundo paso. Abre Google Authenticator, Microsoft '
          'Authenticator u otra app de verificación, escanea este código y escribe los 6 números que te muestre.',
      contenido: [
        CodigoQr(app.enlace),
        const SizedBox(height: EspacioConta.s4),
        Text('¿No puedes escanearlo? Escribe esta clave en la app:', style: TextStyle(color: context.paleta.textoSuave)),
        const SizedBox(height: EspacioConta.s2),
        Row(
          children: [
            Expanded(child: SelectableText(app.claveLegible, style: const TextStyle(fontSize: TextoConta.cuerpo))),
            IconButton(
              tooltip: 'Copiar la clave',
              icon: const Icon(Icons.copy_outlined),
              onPressed: () => Clipboard.setData(ClipboardData(text: app.clave)),
            ),
          ],
        ),
        const SizedBox(height: EspacioConta.s4),
        CampoDeCodigo(controlador: _campo, ocupado: c.ocupado, alCompletar: _confirmar),
        if (c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(c.aviso!)],
        const SizedBox(height: EspacioConta.s4),
        TextButton(onPressed: widget.alCancelar, child: const Text('Ahora no')),
      ],
      accionPrincipal: BotonPrincipal(texto: 'Confirmar', ocupado: c.ocupado, alTocar: _confirmar),
    );
  }
}
