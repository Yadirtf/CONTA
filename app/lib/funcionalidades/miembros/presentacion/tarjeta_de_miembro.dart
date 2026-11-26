import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/miembros.dart';

/// Una persona del negocio: celular enmascarado, rol y, si aún no acepta, «invitado».
class TarjetaDeMiembro extends StatelessWidget {
  const TarjetaDeMiembro({super.key, required this.miembro, this.alRetirar});

  final Miembro miembro;

  /// null para quien no se puede retirar desde aquí (uno mismo, por ejemplo).
  final VoidCallback? alRetirar;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: EspacioConta.s3),
    child: ListTile(
      minTileHeight: AlturaConta.producto,
      leading: Icon(Icons.person_outline, color: context.paleta.textoSuave),
      title: Text(miembro.celular, style: const TextStyle(fontSize: TextoConta.cuerpo)),
      subtitle: Text(miembro.invitado ? '${miembro.rol.nombre} · invitado' : miembro.rol.nombre),
      trailing: alRetirar == null
          ? null
          : IconButton(onPressed: alRetirar, tooltip: 'Quitar del negocio', icon: const Icon(Icons.person_remove_outlined)),
    ),
  );
}
