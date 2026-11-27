import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';
import 'cola_de_comprobantes.dart';
import 'controlador_de_venta.dart';
import 'linea_para_cobrar.dart';
import 'pantalla_listo.dart';
import 'selector_de_medio.dart';

/// Toque 2 y 3 de la venta (HU-06.01): revisar, elegir cómo paga y, si hace falta, a quién; y confirmar.
/// Sin comprador la factura va a consumidor final, que es lo más común en el mostrador.
class PantallaCobrar extends StatelessWidget {
  const PantallaCobrar({
    super.key,
    required this.venta,
    required this.repositorio,
    required this.cola,
    this.elegirComprador,
  });

  final ControladorDeVenta venta;
  final RepositorioDeVentas repositorio;
  final ColaDeComprobantes cola;
  final Future<CompradorDeLaVenta?> Function(BuildContext contexto)? elegirComprador;

  Future<void> _confirmar(BuildContext context) async {
    final navegador = Navigator.of(context);
    final emitida = await venta.confirmar();
    if (emitida == null) return;
    navegador.pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) =>
            PantallaListo(repositorio: repositorio, empresaId: venta.empresaId, venta: emitida, cola: cola),
      ),
    );
  }

  Future<void> _cambiarComprador(BuildContext context) async {
    final elegido = await elegirComprador?.call(context);
    if (elegido != null) venta.elegirComprador(elegido);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Cobrar')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: venta,
        builder: (context, _) {
          final paleta = context.paleta;
          final v = venta;
          if (v.carrito.vacio) {
            return Center(
              child: Text('No quedan productos en la venta.', style: TextStyle(color: paleta.textoSuave)),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(EspacioConta.s4),
            children: [
              for (final linea in v.carrito.lineas)
                LineaParaCobrar(linea: linea, alCambiar: (n) => v.cambiarCantidad(linea.articulo, n)),
              const Divider(),
              Text('Cómo paga', style: TextStyle(color: paleta.textoSuave)),
              const SizedBox(height: EspacioConta.s2),
              SelectorDeMedio(elegido: v.medioDePago, alElegir: v.elegirMedio),
              const SizedBox(height: EspacioConta.s4),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.person_outline),
                title: Text(v.comprador?.nombre ?? 'Consumidor final'),
                subtitle: Text(v.comprador == null ? 'Si pide factura a su nombre, cámbialo' : 'Factura a su nombre'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (v.comprador != null)
                      IconButton(
                        tooltip: 'Volver a consumidor final',
                        icon: const Icon(Icons.close),
                        onPressed: () => v.elegirComprador(null),
                      ),
                    if (elegirComprador != null)
                      TextButton(onPressed: () => _cambiarComprador(context), child: const Text('Cambiar')),
                  ],
                ),
              ),
              const SizedBox(height: EspacioConta.s4),
              if (v.aviso != null) ...[FranjaDeAviso(v.aviso!), const SizedBox(height: EspacioConta.s4)],
              SizedBox(
                height: AlturaConta.botonPrincipal,
                child: BotonPrincipal(
                  texto: 'Confirmar venta · ${pesos(v.carrito.total)}',
                  ocupado: v.enviando,
                  alTocar: () => _confirmar(context),
                ),
              ),
            ],
          );
        },
      ),
    ),
  );
}
