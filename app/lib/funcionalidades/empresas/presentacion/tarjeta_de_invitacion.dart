import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/empresas.dart';

/// Un negocio que invitó a la persona (HU-04.03): dice con qué rol y deja aceptar o rechazar.
/// Hasta aceptar no se puede entrar.
class TarjetaDeInvitacion extends StatelessWidget {
  const TarjetaDeInvitacion({
    super.key,
    required this.empresa,
    required this.ocupado,
    required this.alAceptar,
    required this.alRechazar,
  });

  final Empresa empresa;
  final bool ocupado;
  final VoidCallback alAceptar;
  final VoidCallback alRechazar;

  @override
  Widget build(BuildContext context) {
    final rol = empresa.membresia?.rol.nombre.toLowerCase() ?? 'miembro';
    return Card(
      margin: const EdgeInsets.only(bottom: EspacioConta.s3),
      child: Padding(
        padding: const EdgeInsets.all(EspacioConta.s4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(empresa.razonSocial, style: const TextStyle(fontSize: TextoConta.cuerpo)),
            const SizedBox(height: EspacioConta.s1),
            Text('Te invitaron como $rol.', style: TextStyle(color: context.paleta.textoSuave, fontSize: TextoConta.pequeno)),
            const SizedBox(height: EspacioConta.s3),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: ocupado ? null : alRechazar, child: const Text('No, gracias')),
                ),
                const SizedBox(width: EspacioConta.s3),
                Expanded(
                  child: OutlinedButton(onPressed: ocupado ? null : alAceptar, child: const Text('Aceptar')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
