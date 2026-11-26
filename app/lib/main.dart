import 'package:material_ui/material_ui.dart';

import 'app.dart';
import 'funcionalidades/acceso/datos/almacen_de_sesion_seguro.dart';
import 'funcionalidades/acceso/datos/repositorio_de_acceso_http.dart';
import 'funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'funcionalidades/empresas/datos/repositorio_de_empresas_http.dart';
import 'funcionalidades/salud/datos/repositorio_salud_http.dart';
import 'nucleo/configuracion.dart';

void main() {
  final acceso = ControladorDeAcceso(RepositorioDeAccesoHttp(Configuracion.urlApi), AlmacenDeSesionSeguro());
  final empresas = RepositorioDeEmpresasHttp(Configuracion.urlApi, token: () => acceso.sesion?.token);
  runApp(ContaApp(acceso: acceso, empresas: empresas, repositorioSalud: RepositorioSaludHttp(Configuracion.urlApi)));
}
