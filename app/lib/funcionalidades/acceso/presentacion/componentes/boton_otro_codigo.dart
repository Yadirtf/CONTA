import 'dart:async';

import 'package:material_ui/material_ui.dart';

/// «Pedir otro código» con la cuenta regresiva del minuto de espera, para que nadie toque en vano.
class BotonOtroCodigo extends StatefulWidget {
  const BotonOtroCodigo({super.key, required this.desde, required this.alTocar, this.ahora = DateTime.now});

  final DateTime? desde;
  final VoidCallback alTocar;
  final DateTime Function() ahora;

  @override
  State<BotonOtroCodigo> createState() => _BotonOtroCodigoState();
}

class _BotonOtroCodigoState extends State<BotonOtroCodigo> {
  Timer? _reloj;

  @override
  void initState() {
    super.initState();
    _reloj = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_segundosQueFaltan() >= 0) setState(() {});
    });
  }

  @override
  void dispose() {
    _reloj?.cancel();
    super.dispose();
  }

  int _segundosQueFaltan() {
    final desde = widget.desde;
    return desde == null ? 0 : (desde.difference(widget.ahora()).inMilliseconds / 1000).ceil();
  }

  @override
  Widget build(BuildContext context) {
    final faltan = _segundosQueFaltan();
    return TextButton(
      onPressed: faltan > 0 ? null : widget.alTocar,
      child: Text(faltan > 0 ? 'Pedir otro código en $faltan s' : 'Pedir otro código'),
    );
  }
}
