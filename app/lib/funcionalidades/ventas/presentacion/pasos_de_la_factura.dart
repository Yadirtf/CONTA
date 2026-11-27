import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';

/// Los tres pasos de la factura con ícono y palabra, nunca solo color: guardada, enviada y la respuesta de la DIAN.
class PasosDeLaFactura extends StatelessWidget {
  const PasosDeLaFactura({super.key, required this.estado});

  final EstadoDeLaVenta estado;

  @override
  Widget build(BuildContext context) {
    final paleta = context.paleta;
    final enCamino = estado == EstadoDeLaVenta.pendiente;
    final (icono, color, texto) = switch (estado) {
      EstadoDeLaVenta.pendiente => (Icons.more_horiz, paleta.textoSuave, 'Respuesta de la DIAN'),
      EstadoDeLaVenta.aceptada => (Icons.verified_outlined, paleta.exito, 'Aprobada por la DIAN'),
      EstadoDeLaVenta.rechazada => (Icons.report_outlined, paleta.error, 'La DIAN no la aceptó'),
    };
    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Paso(icono: Icons.check_circle_outline, color: paleta.exito, texto: 'Venta guardada con su número'),
          enCamino
              ? _Paso(icono: Icons.schedule, color: paleta.pendiente, texto: 'Enviándose a la DIAN')
              : _Paso(icono: Icons.check_circle_outline, color: paleta.exito, texto: 'Enviada a la DIAN'),
          _Paso(icono: icono, color: color, texto: texto),
        ],
      ),
    );
  }
}

class _Paso extends StatelessWidget {
  const _Paso({required this.icono, required this.color, required this.texto});

  final IconData icono;
  final Color color;
  final String texto;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: EspacioConta.s1),
    child: Row(
      children: [
        Icon(icono, color: color),
        const SizedBox(width: EspacioConta.s2),
        Expanded(child: Text(texto)),
      ],
    ),
  );
}
