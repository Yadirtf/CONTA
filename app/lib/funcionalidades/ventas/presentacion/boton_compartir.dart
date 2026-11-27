import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'cola_de_comprobantes.dart';
import 'estado_de_compartir.dart';

/// «Compartir factura» en un toque (HU-06.08), con lo que pasa debajo: preparando, en cola o por qué no se pudo.
/// [completo] es el botón ancho de «Listo»; sin él, el ícono de una fila de «Mis ventas».
class BotonCompartir extends StatelessWidget {
  const BotonCompartir({
    super.key,
    required this.cola,
    required this.empresaId,
    required this.ventaId,
    required this.numero,
    this.completo = true,
  });

  final ColaDeComprobantes cola;
  final String empresaId;
  final String ventaId;
  final String numero;
  final bool completo;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: cola,
    builder: (context, _) {
      final estado = cola.estadoDe(ventaId);
      final ocupado = estado?.ocupado ?? false;
      void alTocar() => cola.compartir(empresaId, ventaId, numero);
      if (!completo) {
        return IconButton(
          tooltip: estado?.mensaje ?? 'Compartir factura $numero',
          onPressed: ocupado ? null : alTocar,
          icon: Icon(switch (estado?.tipo) {
            TipoDeEstado.enCola => Icons.schedule,
            TipoDeEstado.fallo => Icons.error_outline,
            _ => Icons.share,
          }),
        );
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: AlturaConta.botonPrincipal,
            child: OutlinedButton.icon(
              onPressed: ocupado ? null : alTocar,
              icon: const Icon(Icons.share),
              label: const Text('Compartir factura'),
            ),
          ),
          if (estado != null) ...[const SizedBox(height: EspacioConta.s2), _Nota(estado)],
        ],
      );
    },
  );
}

class _Nota extends StatelessWidget {
  const _Nota(this.estado);

  final EstadoDeCompartir estado;

  @override
  Widget build(BuildContext context) {
    if (estado.tipo == TipoDeEstado.fallo) return FranjaDeAviso(estado.mensaje);
    return Semantics(
      liveRegion: true,
      child: Text(estado.mensaje, style: TextStyle(color: context.paleta.textoSuave)),
    );
  }
}
