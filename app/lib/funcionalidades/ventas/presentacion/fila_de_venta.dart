import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';
import 'boton_compartir.dart';
import 'cola_de_comprobantes.dart';

/// Una venta en «Mis ventas»: número, comprador, total y en qué va. Se comparte si no fue rechazada: si aún va
/// para la DIAN, queda en cola y sale sola cuando la aprueben.
class FilaDeVenta extends StatelessWidget {
  const FilaDeVenta({super.key, required this.venta, required this.cola, required this.empresaId});

  final VentaReciente venta;
  final ColaDeComprobantes cola;
  final String empresaId;

  static String _estado(EstadoDeLaVenta e) => switch (e) {
    EstadoDeLaVenta.pendiente => 'Va para la DIAN',
    EstadoDeLaVenta.aceptada => 'Aprobada',
    EstadoDeLaVenta.rechazada => 'No aceptada',
  };

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: cola,
    builder: (context, _) {
      final mensaje = cola.estadoDe(venta.id)?.mensaje;
      return ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text('${venta.numero} · ${pesos(venta.total)}'),
        subtitle: Text(
          [venta.comprador, _estado(venta.estado)].join(' · ') + (mensaje == null ? '' : '\n$mensaje'),
          style: TextStyle(color: context.paleta.textoSuave),
        ),
        isThreeLine: mensaje != null,
        trailing: venta.estado == EstadoDeLaVenta.rechazada
            ? null
            : BotonCompartir(cola: cola, empresaId: empresaId, ventaId: venta.id, numero: venta.numero, completo: false),
      );
    },
  );
}
