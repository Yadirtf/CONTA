import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../../verificacion/dominio/verificacion.dart';

/// Pide otra vez el código de la app de verificación antes de cambiar la configuración DIAN (HU-07.04: la API
/// exige haberlo escrito hace menos de 10 minutos). Devuelve true si el código sirvió.
Future<bool> pedirVerificacionReciente(BuildContext context, RepositorioDeVerificacion verificacion) async =>
    await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _Dialogo(verificacion),
    ) ??
    false;

class _Dialogo extends StatefulWidget {
  const _Dialogo(this.verificacion);
  final RepositorioDeVerificacion verificacion;

  @override
  State<_Dialogo> createState() => _DialogoState();
}

class _DialogoState extends State<_Dialogo> {
  final _codigo = TextEditingController();
  bool _ocupado = false;
  String? _aviso;

  @override
  void dispose() {
    _codigo.dispose();
    super.dispose();
  }

  Future<void> _verificar() async {
    if (_ocupado) return;
    setState(() => _ocupado = true);
    final respuesta = await widget.verificacion.verificar(_codigo.text.trim());
    if (!mounted) return;
    if (respuesta is Exito) return Navigator.of(context).pop(true);
    setState(() {
      _ocupado = false;
      _aviso = (respuesta as Rechazo).mensaje;
      _codigo.clear();
    });
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Confirma que eres tú'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Escribe el código de 6 números de tu app de verificación.'),
        const SizedBox(height: EspacioConta.s3),
        TextField(
          controller: _codigo,
          autofocus: true,
          keyboardType: TextInputType.number,
          autofillHints: const [AutofillHints.oneTimeCode],
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: TextoConta.monto, letterSpacing: EspacioConta.s2),
          decoration: const InputDecoration(labelText: 'Código', counterText: ''),
          onChanged: (texto) {
            if (RegExp(r'^\d{6}$').hasMatch(texto)) _verificar();
          },
          onSubmitted: (_) => _verificar(),
        ),
        if (_aviso != null) ...[const SizedBox(height: EspacioConta.s3), FranjaDeAviso(_aviso!)],
      ],
    ),
    actions: [
      TextButton(onPressed: _ocupado ? null : () => Navigator.of(context).pop(false), child: const Text('Ahora no')),
      FilledButton(onPressed: _ocupado ? null : _verificar, child: Text(_ocupado ? 'Un momento…' : 'Confirmar')),
    ],
  );
}
