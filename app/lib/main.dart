import 'package:material_ui/material_ui.dart';

import 'app.dart';
import 'funcionalidades/acceso/datos/almacen_de_sesion_seguro.dart';
import 'funcionalidades/acceso/datos/repositorio_de_acceso_http.dart';
import 'funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'funcionalidades/empresas/datos/repositorio_de_empresas_http.dart';
import 'funcionalidades/miembros/datos/repositorio_de_miembros_http.dart';
import 'funcionalidades/salud/datos/repositorio_salud_http.dart';
import 'funcionalidades/verificacion/datos/repositorio_de_verificacion_http.dart';
import 'nucleo/configuracion.dart';

void main() {
  final acceso = ControladorDeAcceso(RepositorioDeAccesoHttp(Configuracion.urlApi), AlmacenDeSesionSeguro());
  String? token() => acceso.sesion?.token;
  runApp(
    ContaApp(
      acceso: acceso,
      empresas: RepositorioDeEmpresasHttp(Configuracion.urlApi, token: token),
      miembros: RepositorioDeMiembrosHttp(Configuracion.urlApi, token: token),
      verificacion: RepositorioDeVerificacionHttp(Configuracion.urlApi, token: token),
      repositorioSalud: RepositorioSaludHttp(Configuracion.urlApi),
    ),
  );
}
