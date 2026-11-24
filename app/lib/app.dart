import 'package:material_ui/material_ui.dart';

import 'funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'funcionalidades/acceso/presentacion/puerta_de_acceso.dart';
import 'funcionalidades/salud/dominio/estado_api.dart';
import 'funcionalidades/salud/presentacion/pantalla_inicio.dart';
import 'nucleo/tema/tema_conta.dart';

class ContaApp extends StatelessWidget {
  const ContaApp({super.key, required this.acceso, required this.repositorioSalud});

  final ControladorDeAcceso acceso;
  final RepositorioSalud repositorioSalud;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CONTA',
      debugShowCheckedModeBanner: false,
      theme: TemaConta.claro,
      darkTheme: TemaConta.oscuro,
      home: PuertaDeAcceso(
        controlador: acceso,
        adentro: (_) => PantallaInicio(repositorio: repositorioSalud, alSalir: acceso.salir),
      ),
    );
  }
}
