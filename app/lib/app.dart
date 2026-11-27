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
import 'funcionalidades/ventas/dominio/ventas.dart';
import 'funcionalidades/ventas/presentacion/cola_de_comprobantes.dart';
import 'funcionalidades/ventas/presentacion/pantalla_mis_ventas.dart';
import 'funcionalidades/ventas/presentacion/pantalla_vender.dart';
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
    required this.ventas,
    required this.comprobantes,
    required this.verificacion,
    required this.repositorioSalud,
  });

  final ControladorDeAcceso acceso;
  final RepositorioDeEmpresas empresas;
  final RepositorioDeMiembros miembros;
  final RepositorioDeClientes clientes;
  final RepositorioDeProductos productos;
  final RepositorioDeVentas ventas;

  /// Cola para compartir facturas (HU-06.08): una para toda la app, así sigue aunque se cambie de pantalla.
  final ColaDeComprobantes comprobantes;
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
              alVender: (empresa.membresia?.puede(Permiso.vender) ?? false)
                  ? () => Navigator.of(contexto).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PantallaVender(
                          repositorio: ventas,
                          empresaId: empresa.id,
                          buscarArticulos: (texto) => _articulosParaVender(empresa.id, texto),
                          elegirComprador: (c) => _elegirComprador(c, empresa.id),
                          cola: comprobantes,
                        ),
                      ),
                    )
                  : null,
              alVerMisVentas: (empresa.membresia?.puede(Permiso.vender) ?? false)
                  ? () => Navigator.of(contexto).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            PantallaMisVentas(repositorio: ventas, empresaId: empresa.id, cola: comprobantes),
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

  /// Fuera de una venta, elegir un comprador solo confirma a quién se eligió.
  Future<void> _verCompradores(BuildContext contexto, String empresaId) async {
    final mensajero = ScaffoldMessenger.of(contexto);
    final elegido = await Navigator.of(contexto).push<Comprador>(
      MaterialPageRoute(
        builder: (_) => PantallaBuscarComprador(repositorio: clientes, empresaId: empresaId),
      ),
    );
    if (elegido != null) mensajero.showSnackBar(SnackBar(content: Text('Comprador: ${elegido.nombre}')));
  }

  /// La venta (HU-06.01) elige comprador con la búsqueda de clientes, sin conocer sus datos.
  Future<CompradorDeLaVenta?> _elegirComprador(BuildContext contexto, String empresaId) async {
    final elegido = await Navigator.of(contexto).push<Comprador>(
      MaterialPageRoute(
        builder: (_) => PantallaBuscarComprador(repositorio: clientes, empresaId: empresaId),
      ),
    );
    // El consumidor final no tiene id: la venta va sin comprador, que es lo mismo.
    final id = elegido?.id;
    return elegido == null || id == null ? null : CompradorDeLaVenta(id: id, nombre: elegido.nombre);
  }

  /// La venta muestra los productos del catálogo con su precio con IVA; cobra el que tenga la API.
  Future<Respuesta<List<ArticuloEnVenta>>> _articulosParaVender(String empresaId, String texto) async =>
      switch (await productos.buscar(empresaId, texto)) {
        Exito(:final valor) => Exito([
          for (final p in valor) ArticuloEnVenta(id: p.id, nombre: p.nombre, precio: p.precio.total),
        ]),
        Rechazo(:final codigo, :final mensaje) => Rechazo(codigo, mensaje),
      };
}
