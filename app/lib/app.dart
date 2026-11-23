import 'package:material_ui/material_ui.dart';

import 'funcionalidades/salud/dominio/estado_api.dart';
import 'funcionalidades/salud/presentacion/pantalla_inicio.dart';

class ContaApp extends StatelessWidget {
  const ContaApp({super.key, required this.repositorioSalud});

  final RepositorioSalud repositorioSalud;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CONTA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF1A7F37)),
      home: PantallaInicio(repositorio: repositorioSalud),
    );
  }
}
