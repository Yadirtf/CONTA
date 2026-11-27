import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/ventas.dart';
import 'boton_compartir.dart';
import 'cola_de_comprobantes.dart';
import 'controlador_de_estado.dart';
import 'pasos_de_la_factura.dart';

/// «Listo» (HU-06.01): el documento (factura o tiquete POS, HU-06.02) con su número, el total y en qué va ante la DIAN. La venta ya está guardada:
/// salir de aquí no la deshace y la factura sigue su camino.
class PantallaListo extends StatefulWidget {
  const PantallaListo({
    super.key,
    required this.repositorio,
    required this.empresaId,
    required this.venta,
    required this.cola,
    this.esperar,
  });

  final RepositorioDeVentas repositorio;
  final String empresaId;
  final VentaEmitida venta;

  /// Comparte el PDF (HU-06.08). Vive en la composición: la cola sigue aunque se salga de aquí.
  final ColaDeComprobantes cola;

  /// Para las pruebas: cómo se espera entre consultas.
  final Future<void> Function(Duration)? esperar;

  @override
  State<PantallaListo> createState() => _PantallaListoState();
}

class _PantallaListoState extends State<PantallaListo> {
  late final _estado = ControladorDeEstado(
    widget.repositorio,
    widget.empresaId,
    widget.venta,
    esperar: widget.esperar ?? Future<void>.delayed,
  )..seguir();

  @override
  void dispose() {
    _estado.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Listo'), automaticallyImplyLeading: false),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _estado,
        builder: (context, _) {
          final paleta = context.paleta;
          final v = _estado.venta;
          return ListView(
            padding: const EdgeInsets.all(EspacioConta.s4),
            children: [
              Text(
                '${v.documento.nombre} ${v.numero}',
                style: const TextStyle(fontSize: TextoConta.titulo, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: EspacioConta.s2),
              Text(
                pesos(v.total),
                style: const TextStyle(fontSize: TextoConta.total, fontWeight: FontWeight.w700),
              ),
              Text('IVA ${pesos(v.iva)} · ${v.comprador}', style: TextStyle(color: paleta.textoSuave)),
              const SizedBox(height: EspacioConta.s6),
              PasosDeLaFactura(estado: v.estado),
              const SizedBox(height: EspacioConta.s2),
              Text(v.mensaje, style: TextStyle(color: paleta.textoSuave)),
              for (final motivo in v.motivos) ...[const SizedBox(height: EspacioConta.s2), FranjaDeAviso(motivo)],
              if (_estado.sinRespuestaAun) ...[
                const SizedBox(height: EspacioConta.s2),
                Text(
                  'La DIAN está demorando. La venta ya quedó guardada y la factura se sigue enviando sola.',
                  style: TextStyle(color: paleta.textoSuave),
                ),
              ],
              const SizedBox(height: EspacioConta.s8),
              if (v.estado != EstadoDeLaVenta.rechazada) ...[
                BotonCompartir(cola: widget.cola, empresaId: widget.empresaId, ventaId: v.id, numero: v.numero),
                const SizedBox(height: EspacioConta.s4),
              ],
              SizedBox(
                height: AlturaConta.botonPrincipal,
                child: FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Nueva venta')),
              ),
            ],
          );
        },
      ),
    ),
  );
}
