import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/productos.dart';

/// Un producto: su nombre, lo que se cobra y cuánto de eso es IVA, como lo separó la API.
class TarjetaDeProducto extends StatelessWidget {
  const TarjetaDeProducto({super.key, required this.producto});

  final Producto producto;

  /// «IVA 19 %: $ 1.596,64 de $ 10.000» o «Sin IVA (excluido)».
  static String detalleDe(Producto producto) => producto.iva.cobraIva
      ? '${producto.iva.nombre}: ${pesos(producto.precio.iva)} · sin IVA ${pesos(producto.precio.base)}'
      : producto.iva.nombre;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      minTileHeight: 56,
      title: Text(producto.nombre, style: const TextStyle(fontSize: TextoConta.subtitulo)),
      subtitle: Text(detalleDe(producto), style: TextStyle(color: context.paleta.textoSuave)),
      trailing: Text(
        producto.unidad == UnidadDeMedida.unidad
            ? pesos(producto.precio.total)
            : '${pesos(producto.precio.total)} / ${producto.unidad.nombre.toLowerCase()}',
        style: const TextStyle(fontSize: TextoConta.subtitulo, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
