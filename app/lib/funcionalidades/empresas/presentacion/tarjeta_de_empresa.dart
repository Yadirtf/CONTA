import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/empresas.dart';

/// Un negocio de la lista: un toque grande lleva a trabajar en él.
class TarjetaDeEmpresa extends StatelessWidget {
  const TarjetaDeEmpresa({super.key, required this.empresa, required this.alTocar});

  final Empresa empresa;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: EspacioConta.s3),
    child: ListTile(
      minTileHeight: AlturaConta.producto,
      leading: Icon(Icons.storefront_outlined, color: context.paleta.textoSuave),
      title: Text(empresa.razonSocial, style: const TextStyle(fontSize: TextoConta.cuerpo)),
      trailing: const Icon(Icons.chevron_right),
      onTap: alTocar,
    ),
  );
}
