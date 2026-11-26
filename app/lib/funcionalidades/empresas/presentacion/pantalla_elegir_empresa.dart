import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/marco_de_formulario.dart';
import 'controlador_de_empresas.dart';
import 'tarjeta_de_empresa.dart';

/// Lleva varios negocios: elige en cuál trabajar. Lo que se vea después es solo de ese negocio.
class PantallaElegirEmpresa extends StatelessWidget {
  const PantallaElegirEmpresa({super.key, required this.controlador});

  final ControladorDeEmpresas controlador;

  @override
  Widget build(BuildContext context) => MarcoDeFormulario(
    titulo: '¿En qué negocio vas a trabajar?',
    explicacion: 'Puedes cambiar de negocio cuando quieras.',
    contenido: [
      for (final empresa in controlador.empresas)
        TarjetaDeEmpresa(empresa: empresa, alTocar: () => controlador.elegir(empresa)),
    ],
    accionPrincipal: OutlinedButton.icon(
      onPressed: controlador.irACrear,
      icon: const Icon(Icons.add),
      label: const Text('Agregar otro negocio'),
    ),
  );
}
