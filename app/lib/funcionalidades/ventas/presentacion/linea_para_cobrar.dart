import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';

/// Una línea en «Cobrar»: nombre, subtotal y botones para quitar o sumar una unidad.
class LineaParaCobrar extends StatelessWidget {
  const LineaParaCobrar({super.key, required this.linea, required this.alCambiar});

  final LineaDelCarrito linea;
  final ValueChanged<int> alCambiar;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    title: Text(linea.articulo.nombre),
    subtitle: Text(pesos(montoDe(linea.centavos)), style: TextStyle(color: context.paleta.textoSuave)),
    trailing: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: linea.cantidad == 1 ? 'Quitar ${linea.articulo.nombre}' : 'Uno menos',
          icon: Icon(linea.cantidad == 1 ? Icons.delete_outline : Icons.remove),
          onPressed: () => alCambiar(linea.cantidad - 1),
        ),
        Text('${linea.cantidad}', style: const TextStyle(fontSize: TextoConta.subtitulo)),
        IconButton(tooltip: 'Uno más', icon: const Icon(Icons.add), onPressed: () => alCambiar(linea.cantidad + 1)),
      ],
    ),
  );
}
