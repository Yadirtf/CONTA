import 'package:material_ui/material_ui.dart';

import '../dominio/empresas.dart';
import 'controlador_de_empresas.dart';
import 'pantalla_crear_empresa.dart';
import 'pantalla_elegir_empresa.dart';
import 'pantalla_sin_conexion.dart';

/// Lo de adentro de una empresa, con la empresa elegida y la forma de cambiarla.
typedef AdentroDeEmpresa = Widget Function(BuildContext context, Empresa empresa, VoidCallback cambiar);

/// Muestra el paso para elegir o crear el negocio y, con uno elegido, lo de adentro (HU-04.02).
/// Lo de adentro lleva como llave el id de la empresa: al cambiar, Flutter descarta todo su estado y nada de la
/// empresa anterior queda en pantalla.
class PuertaDeEmpresa extends StatefulWidget {
  const PuertaDeEmpresa({super.key, required this.repositorio, required this.adentro, this.alPerderSesion});

  final RepositorioDeEmpresas repositorio;
  final AdentroDeEmpresa adentro;
  final VoidCallback? alPerderSesion;

  @override
  State<PuertaDeEmpresa> createState() => _PuertaDeEmpresaState();
}

class _PuertaDeEmpresaState extends State<PuertaDeEmpresa> {
  late final _controlador = ControladorDeEmpresas(widget.repositorio, alPerderSesion: widget.alPerderSesion);

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
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _controlador,
    builder: (context, _) => switch (_controlador.paso) {
      PasoDeEmpresas.cargando => const Scaffold(body: Center(child: CircularProgressIndicator())),
      PasoDeEmpresas.sinConexion => PantallaSinConexion(controlador: _controlador),
      PasoDeEmpresas.crear => PantallaCrearEmpresa(controlador: _controlador),
      PasoDeEmpresas.elegir => PantallaElegirEmpresa(controlador: _controlador),
      PasoDeEmpresas.adentro => KeyedSubtree(
        key: ValueKey(_controlador.elegida!.id),
        child: widget.adentro(context, _controlador.elegida!, _controlador.cambiar),
      ),
    },
  );
}
