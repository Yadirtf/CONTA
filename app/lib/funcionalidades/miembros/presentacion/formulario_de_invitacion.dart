import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/miembros.dart';
import 'controlador_de_miembros.dart';

/// Invitar a una persona: su celular y qué será en el negocio. Cajero por defecto, que es lo más común.
class FormularioDeInvitacion extends StatefulWidget {
  const FormularioDeInvitacion({super.key, required this.controlador});

  final ControladorDeMiembros controlador;

  @override
  State<FormularioDeInvitacion> createState() => _FormularioDeInvitacionState();
}

class _FormularioDeInvitacionState extends State<FormularioDeInvitacion> {
  final _celular = TextEditingController();
  Rol _rol = Rol.cajero;

  @override
  void dispose() {
    _celular.dispose();
    super.dispose();
  }

  Future<void> _invitar() async {
    if (await widget.controlador.invitar(_celular.text, _rol)) _celular.clear();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      TextField(
        controller: _celular,
        keyboardType: TextInputType.phone,
        textInputAction: TextInputAction.done,
        style: const TextStyle(fontSize: TextoConta.subtitulo),
        decoration: const InputDecoration(labelText: 'Celular de la persona', hintText: '300 123 4567'),
      ),
      const SizedBox(height: EspacioConta.s3),
      SegmentedButton<Rol>(
        segments: [for (final rol in Rol.values) ButtonSegment(value: rol, label: Text(rol.nombre))],
        selected: {_rol},
        onSelectionChanged: (elegido) => setState(() => _rol = elegido.single),
      ),
      const SizedBox(height: EspacioConta.s2),
      Text(_explicacion(_rol), style: TextStyle(color: context.paleta.textoSuave, fontSize: TextoConta.pequeno)),
      const SizedBox(height: EspacioConta.s4),
      BotonPrincipal(texto: 'Invitar', ocupado: widget.controlador.ocupado, alTocar: _invitar),
    ],
  );

  static String _explicacion(Rol rol) => switch (rol) {
    Rol.cajero => 'Vende. No ve informes ni anula facturas.',
    Rol.contador => 'Ve informes y anula facturas. Trabaja en modo contador.',
    Rol.dueno => 'Puede todo, también invitar y quitar personas.',
  };
}
