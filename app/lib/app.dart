import 'package:material_ui/material_ui.dart';

import 'funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'funcionalidades/acceso/presentacion/puerta_de_acceso.dart';
import 'funcionalidades/clientes/dominio/clientes.dart';
import 'funcionalidades/clientes/presentacion/pantalla_buscar_comprador.dart';
import 'funcionalidades/empresas/dominio/empresas.dart';
import 'funcionalidades/empresas/presentacion/pantalla_de_empresa.dart';
import 'funcionalidades/empresas/presentacion/puerta_de_empresa.dart';
import 'funcionalidades/miembros/dominio/miembros.dart';
import 'funcionalidades/miembros/presentacion/pantalla_de_personas.dart';
import 'funcionalidades/productos/dominio/productos.dart';
import 'funcionalidades/productos/presentacion/pantalla_productos.dart';
import 'funcionalidades/salud/dominio/estado_api.dart';
import 'funcionalidades/salud/presentacion/estado_del_servidor.dart';
import 'funcionalidades/verificacion/dominio/verificacion.dart';
import 'funcionalidades/verificacion/presentacion/puerta_de_verificacion.dart';
import 'nucleo/tema/tema_conta.dart';

/// Composición: primero la sesión, después el negocio en el que se trabaja, la verificación en dos pasos si
/// ese negocio la exige y, adentro, lo de ese negocio.
class ContaApp extends StatelessWidget {
  const ContaApp({
    super.key,
    required this.acceso,
    required this.empresas,
    required this.miembros,
    required this.clientes,
    required this.productos,
    required this.verificacion,
    required this.repositorioSalud,
  });

  final ControladorDeAcceso acceso;
  final RepositorioDeEmpresas empresas;
  final RepositorioDeMiembros miembros;
  final RepositorioDeClientes clientes;
  final RepositorioDeProductos productos;
  final RepositorioDeVerificacion verificacion;
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
          adentro: (_, empresa, cambiar) => PuertaDeVerificacion(
            exigida: empresa.membresia?.exigeSegundoPaso ?? false,
            repositorio: verificacion,
            alCancelar: cambiar,
            alPerderSesion: acceso.salir,
            adentro: (contexto) => PantallaDeEmpresa(
              empresa: empresa,
              repositorio: empresas,
              alCambiar: cambiar,
              alSalir: acceso.salir,
              // Solo con el permiso que manda la API; si faltara, la API igual respondería «No tienes permiso».
              alVerPersonas: (empresa.membresia?.puede(Permiso.gestionarMiembros) ?? false)
                  ? () => Navigator.of(contexto).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PantallaDePersonas(repositorio: miembros, empresaId: empresa.id),
                      ),
                    )
                  : null,
              alVerCompradores: (empresa.membresia?.puede(Permiso.vender) ?? false)
                  ? () => _verCompradores(contexto, empresa.id)
                  : null,
              alVerProductos: (empresa.membresia?.puede(Permiso.vender) ?? false)
                  ? () => Navigator.of(contexto).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PantallaProductos(
                          repositorio: productos,
                          empresaId: empresa.id,
                          puedeCrear: empresa.membresia?.puede(Permiso.gestionarProductos) ?? false,
                        ),
                      ),
                    )
                  : null,
              contenido: EstadoDelServidor(repositorio: repositorioSalud),
            ),
          ),
        ),
      ),
    );
  }

  /// Mientras no exista la venta (HU-06.01), elegir un comprador solo confirma a quién se eligió.
  Future<void> _verCompradores(BuildContext contexto, String empresaId) async {
    final mensajero = ScaffoldMessenger.of(contexto);
    final elegido = await Navigator.of(contexto).push<Comprador>(
      MaterialPageRoute(builder: (_) => PantallaBuscarComprador(repositorio: clientes, empresaId: empresaId)),
    );
    if (elegido != null) mensajero.showSnackBar(SnackBar(content: Text('Comprador: ${elegido.nombre}')));
  }
}
