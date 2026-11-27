import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';

/// Abajo de «Vender»: cuántas unidades van y el total. Tocarla es el toque 2.
class BarraDeCobro extends StatelessWidget {
  const BarraDeCobro({super.key, required this.carrito, required this.alCobrar});

  final Carrito carrito;
  final VoidCallback alCobrar;

  @override
  Widget build(BuildContext context) => SafeArea(
    minimum: const EdgeInsets.all(EspacioConta.s4),
    child: SizedBox(
      height: AlturaConta.botonPrincipal,
      child: FilledButton(
        onPressed: carrito.vacio ? null : alCobrar,
        child: Text(
          carrito.vacio
              ? 'Toca un producto para vender'
              : 'Cobrar ${pesos(carrito.total)} · ${_unidades(carrito.unidades)}',
        ),
      ),
    ),
  );

  static String _unidades(int n) => n == 1 ? '1 producto' : '$n productos';
}
