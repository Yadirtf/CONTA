import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/miembros.dart';
import 'controlador_de_miembros.dart';
import 'formulario_de_invitacion.dart';
import 'tarjeta_de_miembro.dart';

/// Las personas del negocio (HU-04.03): invitar a alguien por su celular y quitar a quien ya no trabaja.
/// Solo llega aquí quien tiene el permiso; si no, la API respondería «No tienes permiso».
class PantallaDePersonas extends StatefulWidget {
  const PantallaDePersonas({super.key, required this.repositorio, required this.empresaId});

  final RepositorioDeMiembros repositorio;
  final String empresaId;

  @override
  State<PantallaDePersonas> createState() => _PantallaDePersonasState();
}

class _PantallaDePersonasState extends State<PantallaDePersonas> {
  late final _controlador = ControladorDeMiembros(widget.repositorio, widget.empresaId);

  @override
  void initState() {
    super.initState();
    _controlador.cargar();
  }

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Personas del negocio')),
    body: SafeArea(
      child: ListenableBuilder(
        listenable: _controlador,
        builder: (context, _) {
          final c = _controlador;
          if (c.cargando) return const Center(child: CircularProgressIndicator());
          return ListView(
            padding: const EdgeInsets.all(EspacioConta.s4),
            children: [
              FormularioDeInvitacion(controlador: c),
              if (c.aviso != null) ...[const SizedBox(height: EspacioConta.s4), FranjaDeAviso(c.aviso!)],
              const SizedBox(height: EspacioConta.s6),
              for (final miembro in c.miembros)
                TarjetaDeMiembro(
                  miembro: miembro,
                  // El dueño no se quita desde aquí: la API exige que quede al menos uno.
                  alRetirar: miembro.rol == Rol.dueno || c.ocupado ? null : () => c.retirar(miembro),
                ),
            ],
          );
        },
      ),
    ),
  );
}
