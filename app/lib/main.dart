import 'package:material_ui/material_ui.dart';

import 'app.dart';
import 'funcionalidades/salud/datos/repositorio_salud_http.dart';
import 'nucleo/configuracion.dart';

void main() {
  runApp(ContaApp(repositorioSalud: RepositorioSaludHttp(Configuracion.urlApi)));
}
