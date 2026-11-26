import 'package:material_ui/material_ui.dart';

import 'funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'funcionalidades/acceso/presentacion/puerta_de_acceso.dart';
import 'funcionalidades/empresas/dominio/empresas.dart';
import 'funcionalidades/empresas/presentacion/pantalla_de_empresa.dart';
import 'funcionalidades/empresas/presentacion/puerta_de_empresa.dart';
import 'funcionalidades/salud/dominio/estado_api.dart';
import 'funcionalidades/salud/presentacion/estado_del_servidor.dart';
import 'nucleo/tema/tema_conta.dart';

/// Composición: primero la sesión, después el negocio en el que se trabaja y, adentro, lo de ese negocio.
class ContaApp extends StatelessWidget {
  const ContaApp({super.key, required this.acceso, required this.empresas, required this.repositorioSalud});

  final ControladorDeAcceso acceso;
  final RepositorioDeEmpresas empresas;
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
        adentro: (_) => PuertaDeEmpresa(
          repositorio: empresas,
          alPerderSesion: acceso.salir,
          adentro: (_, empresa, cambiar) => PantallaDeEmpresa(
            empresa: empresa,
            repositorio: empresas,
            alCambiar: cambiar,
            alSalir: acceso.salir,
            contenido: EstadoDelServidor(repositorio: repositorioSalud),
          ),
        ),
      ),
    );
  }
}
