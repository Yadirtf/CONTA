import 'package:material_ui/material_ui.dart';

import '../../../nucleo/tema/tema_conta.dart';
import '../dominio/clientes.dart';

/// Un comprador encontrado: su nombre y su documento. Tocarlo lo elige.
class TarjetaDeComprador extends StatelessWidget {
  const TarjetaDeComprador({super.key, required this.comprador, required this.alElegir});

  final Comprador comprador;
  final VoidCallback alElegir;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      minTileHeight: 56,
      leading: Icon(comprador.tipoDePersona == TipoDePersona.juridica ? Icons.storefront_outlined : Icons.person_outline),
      title: Text(comprador.nombre, style: const TextStyle(fontSize: TextoConta.subtitulo)),
      subtitle: Text(comprador.documento, style: TextStyle(color: context.paleta.textoSuave)),
      trailing: const Icon(Icons.chevron_right),
      onTap: alElegir,
    ),
  );
}
