import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/pasos_de_configuracion.dart';

/// Una tarjeta de «Lo que falta para facturar»: el paso, su estado con ícono y palabra (nunca solo color) y
/// lo guardado en una línea. Tocarla abre su formulario corto.
class TarjetaDePaso extends StatelessWidget {
  const TarjetaDePaso({
    super.key,
    required this.titulo,
    required this.estado,
    required this.resumen,
    this.alTocar,
    this.accion,
  });

  final String titulo;
  final EstadoDelPaso estado;
  final String resumen;
  final VoidCallback? alTocar;

  /// En lugar de la flecha (el interruptor de «siempre factura», por ejemplo).
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    final paleta = context.paleta;
    final (icono, color, palabra) = switch (estado) {
      EstadoDelPaso.listo => (Icons.check_circle_outline, paleta.exito, 'Listo'),
      EstadoDelPaso.falta => (Icons.error_outline, paleta.advertencia, 'Falta'),
      EstadoDelPaso.opcional => (Icons.radio_button_unchecked, paleta.textoSuave, 'Opcional'),
    };
    return Card(
      margin: const EdgeInsets.only(bottom: EspacioConta.s3),
      child: ListTile(
        minTileHeight: AlturaConta.producto,
        onTap: alTocar,
        leading: Icon(icono, color: color, semanticLabel: palabra),
        title: Text(titulo, style: const TextStyle(fontSize: TextoConta.cuerpo, fontWeight: FontWeight.w600)),
        subtitle: Text('$palabra · $resumen'),
        trailing: accion ?? (alTocar == null ? null : const Icon(Icons.chevron_right)),
      ),
    );
  }
}
