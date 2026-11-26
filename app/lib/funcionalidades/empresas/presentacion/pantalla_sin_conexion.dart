import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import 'controlador_de_empresas.dart';

/// No se pudieron traer los negocios: dice por qué y deja intentar de nuevo.
class PantallaSinConexion extends StatelessWidget {
  const PantallaSinConexion({super.key, required this.controlador});

  final ControladorDeEmpresas controlador;

  @override
  Widget build(BuildContext context) => MarcoDeFormulario(
    titulo: 'No pudimos traer tus negocios',
    explicacion: 'Revisa tu conexión e intenta otra vez.',
    contenido: [if (controlador.aviso != null) FranjaDeAviso(controlador.aviso!)],
    accionPrincipal: BotonPrincipal(texto: 'Intentar otra vez', ocupado: false, alTocar: controlador.cargar),
  );
}
