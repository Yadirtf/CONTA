import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';

/// Un producto en «Vender»: un toque suma una unidad. Muestra cuántas van, con palabras para el lector.
class TarjetaParaVender extends StatelessWidget {
  const TarjetaParaVender({super.key, required this.articulo, required this.cantidad, required this.alTocar});

  final ArticuloEnVenta articulo;
  final int cantidad;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final paleta = context.paleta;
    return Card(
      child: ListTile(
        minTileHeight: AlturaConta.producto,
        onTap: alTocar,
        title: Text(articulo.nombre, style: const TextStyle(fontSize: TextoConta.subtitulo)),
        subtitle: Text(pesos(articulo.precio), style: TextStyle(color: paleta.textoSuave)),
        trailing: cantidad == 0
            ? Icon(Icons.add_circle_outline, color: paleta.acento, semanticLabel: 'Agregar')
            : Semantics(
                label: '$cantidad en la venta',
                excludeSemantics: true,
                child: CircleAvatar(
                  backgroundColor: paleta.acento,
                  foregroundColor: paleta.sobreAcento,
                  child: Text('$cantidad', style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
      ),
    );
  }
}
