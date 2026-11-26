import 'package:material_ui/material_ui.dart';

import '../../../nucleo/componentes/boton_principal.dart';
import '../../../nucleo/componentes/franja_de_aviso.dart';
import '../../../nucleo/componentes/marco_de_formulario.dart';
import '../dominio/verificacion.dart';
import 'controlador_de_verificacion.dart';
import 'pantalla_codigos_de_recuperacion.dart';
import 'pantalla_configurar_app.dart';
import 'pantalla_verificar.dart';

/// Antes de lo de adentro de un negocio que exige la verificación en dos pasos (contador o modo contador,
/// HU-04.04), muestra el paso que falte. Si el negocio no la exige, muestra lo de adentro sin preguntar nada.
/// La API igual la exige en cada petición: esta puerta solo evita que la persona vea «no tienes permiso».
class PuertaDeVerificacion extends StatefulWidget {
  const PuertaDeVerificacion({
    super.key,
    required this.exigida,
    required this.repositorio,
    required this.adentro,
    required this.alCancelar,
    this.alPerderSesion,
  });

  final bool exigida;
  final RepositorioDeVerificacion repositorio;
  final WidgetBuilder adentro;

  /// «Ahora no»: vuelve a la lista de negocios.
  final VoidCallback alCancelar;
  final VoidCallback? alPerderSesion;

  @override
  State<PuertaDeVerificacion> createState() => _PuertaDeVerificacionState();
}

class _PuertaDeVerificacionState extends State<PuertaDeVerificacion> {
  late final _controlador = ControladorDeVerificacion(widget.repositorio, alPerderSesion: widget.alPerderSesion);

  @override
  void initState() {
    super.initState();
    if (widget.exigida) _controlador.cargar();
  }

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.exigida) return widget.adentro(context);
    return ListenableBuilder(
      listenable: _controlador,
      builder: (context, _) => switch (_controlador.paso) {
        PasoDeVerificacion.cargando => const Scaffold(body: Center(child: CircularProgressIndicator())),
        PasoDeVerificacion.sinConexion => MarcoDeFormulario(
          titulo: 'No pudimos seguir',
          explicacion: 'Revisa tu conexión e intenta otra vez.',
          contenido: [if (_controlador.aviso != null) FranjaDeAviso(_controlador.aviso!)],
          accionPrincipal: BotonPrincipal(texto: 'Intentar otra vez', ocupado: false, alTocar: _controlador.cargar),
        ),
        PasoDeVerificacion.configurar => PantallaConfigurarApp(controlador: _controlador, alCancelar: widget.alCancelar),
        PasoDeVerificacion.guardarCodigos => PantallaCodigosDeRecuperacion(controlador: _controlador),
        PasoDeVerificacion.verificar => PantallaVerificar(controlador: _controlador, alCancelar: widget.alCancelar),
        PasoDeVerificacion.listo => widget.adentro(context),
      },
    );
  }
}
