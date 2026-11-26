import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/productos.dart';
import 'controlador_de_producto_nuevo.dart';
import 'selector_de_iva.dart';

/// Crear un producto (HU-05.02): nombre, precio y si cobra IVA. Lo normal es escribir el precio al que se vende,
/// con el IVA ya incluido; la API separa la base y el impuesto. Al guardar, devuelve el producto.
class PantallaProductoNuevo extends StatefulWidget {
  const PantallaProductoNuevo({super.key, required this.repositorio, required this.empresaId});

  final RepositorioDeProductos repositorio;
  final String empresaId;

  @override
  State<PantallaProductoNuevo> createState() => _PantallaProductoNuevoState();
}

class _PantallaProductoNuevoState extends State<PantallaProductoNuevo> {
  late final _controlador = ControladorDeProductoNuevo(widget.repositorio, widget.empresaId);
  final _nombre = TextEditingController();
  final _precio = TextEditingController();
  final _codigo = TextEditingController();
  IvaDelProducto _iva = IvaDelProducto.general;
  UnidadDeMedida _unidad = UnidadDeMedida.unidad;
  bool _incluyeIva = true;

  @override
  void dispose() {
    for (final campo in [_nombre, _precio, _codigo]) {
      campo.dispose();
    }
    _controlador.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    final producto = await _controlador.guardar(
      nombre: _nombre.text,
      precio: _precio.text,
      precioIncluyeIva: _incluyeIva,
      iva: _iva,
      unidad: _unidad,
      codigo: _codigo.text,
    );
    if (producto != null && mounted) Navigator.of(context).pop(producto);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Producto nuevo')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _controlador,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.all(EspacioConta.s4),
          children: [
            TextField(
              controller: _nombre,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Nombre', hintText: 'Gaseosa 400 ml'),
            ),
            const SizedBox(height: EspacioConta.s3),
            TextField(
              controller: _precio,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(fontSize: TextoConta.subtitulo),
              decoration: InputDecoration(
                labelText: 'Precio de venta',
                prefixText: r'$ ',
                helperText: _iva.cobraIva && !_incluyeIva
                    ? 'Sin IVA: le sumamos el IVA al guardar.'
                    : 'Lo que paga el cliente.',
              ),
            ),
            const SizedBox(height: EspacioConta.s3),
            DropdownButtonFormField<UnidadDeMedida>(
              initialValue: _unidad,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Se vende por'),
              items: [for (final u in UnidadDeMedida.values) DropdownMenuItem(value: u, child: Text(u.nombre))],
              onChanged: (unidad) => setState(() => _unidad = unidad ?? _unidad),
            ),
            const SizedBox(height: EspacioConta.s4),
            Text('¿Cobra IVA?', style: Theme.of(context).textTheme.titleMedium),
            SelectorDeIva(elegido: _iva, alElegir: (iva) => setState(() => _iva = iva)),
            if (_iva.cobraIva)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('El precio ya incluye el IVA'),
                subtitle: Text(
                  _incluyeIva ? 'Así lo ve el cliente en el mostrador.' : 'Escribiste el precio antes de IVA.',
                  style: TextStyle(color: context.paleta.textoSuave),
                ),
                value: _incluyeIva,
                onChanged: (valor) => setState(() => _incluyeIva = valor),
              ),
            const SizedBox(height: EspacioConta.s3),
            TextField(
              controller: _codigo,
              decoration: const InputDecoration(labelText: 'Código o código de barras (opcional)'),
            ),
            if (_controlador.aviso != null) ...[
              const SizedBox(height: EspacioConta.s4),
              FranjaDeAviso(_controlador.aviso!),
            ],
            const SizedBox(height: EspacioConta.s6),
            BotonPrincipal(texto: 'Guardar producto', ocupado: _controlador.ocupado, alTocar: _guardar),
          ],
        ),
      ),
    ),
  );
}
