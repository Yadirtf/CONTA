import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../../../nucleo/tema/tema_conta.dart';
import 'controlador_de_empresas.dart';
import 'tarjeta_de_empresa.dart';
import 'tarjeta_de_invitacion.dart';

/// Lleva varios negocios: elige en cuál trabajar. Lo que se vea después es solo de ese negocio.
/// Arriba, las invitaciones pendientes, para aceptarlas o rechazarlas (HU-04.03).
class PantallaElegirEmpresa extends StatelessWidget {
  const PantallaElegirEmpresa({super.key, required this.controlador});

  final ControladorDeEmpresas controlador;

  @override
  Widget build(BuildContext context) {
    final c = controlador;
    return MarcoDeFormulario(
      titulo: '¿En qué negocio vas a trabajar?',
      explicacion: 'Puedes cambiar de negocio cuando quieras.',
      contenido: [
        if (c.aviso != null) ...[FranjaDeAviso(c.aviso!), const SizedBox(height: EspacioConta.s4)],
        for (final empresa in c.empresas.where((e) => e.invitada))
          TarjetaDeInvitacion(
            empresa: empresa,
            ocupado: c.ocupado,
            alAceptar: () => c.responder(empresa, aceptar: true),
            alRechazar: () => c.responder(empresa, aceptar: false),
          ),
        for (final empresa in c.empresas.where((e) => !e.invitada))
          TarjetaDeEmpresa(empresa: empresa, alTocar: () => c.elegir(empresa)),
      ],
      accionPrincipal: OutlinedButton.icon(
        onPressed: c.irACrear,
        icon: const Icon(Icons.add),
        label: const Text('Agregar otro negocio'),
      ),
    );
  }
}
