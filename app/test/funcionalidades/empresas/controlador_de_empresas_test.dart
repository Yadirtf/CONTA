import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';
import 'package:conta_app/funcionalidades/empresas/presentacion/controlador_de_empresas.dart';
import 'package:test/test.dart';

import 'dobles.dart';

void main() {
  test('sin empresas pide crear la primera y, al crearla, entra a ella', () async {
    final c = ControladorDeEmpresas(RepositorioDeEmpresasFalso());
    await c.cargar();
    expect(c.paso, PasoDeEmpresas.crear);
    await c.crear('  Tienda Doña Rosa ');
    expect(c.paso, PasoDeEmpresas.adentro);
    expect(c.elegida?.razonSocial, 'Tienda Doña Rosa');
  });

  test('con una sola empresa entra directo; con tres pide elegir', () async {
    final una = ControladorDeEmpresas(RepositorioDeEmpresasFalso([panaderia]));
    await una.cargar();
    expect((una.paso, una.elegida), (PasoDeEmpresas.adentro, panaderia));

    final tres = ControladorDeEmpresas(RepositorioDeEmpresasFalso([drogueria, ferreteria, panaderia]));
    await tres.cargar();
    expect((tres.paso, tres.elegida), (PasoDeEmpresas.elegir, null));
  });

  test('cambiar de empresa olvida la anterior y vuelve a la lista', () async {
    final c = ControladorDeEmpresas(RepositorioDeEmpresasFalso([drogueria, ferreteria, panaderia]));
    await c.cargar();
    c.elegir(ferreteria);
    c.cambiar();
    expect((c.paso, c.elegida), (PasoDeEmpresas.elegir, null));
    c.elegir(drogueria);
    expect(c.elegida, drogueria);
  });

  test('un nombre vacío no se envía', () async {
    final repositorio = RepositorioDeEmpresasFalso();
    final c = ControladorDeEmpresas(repositorio);
    await c.cargar();
    await c.crear('   ');
    expect(c.aviso, isNotNull);
    expect(repositorio.empresas, isEmpty);
  });

  test('si la sesión ya no sirve, avisa para volver a entrar', () async {
    var perdida = false;
    final repositorio = RepositorioDeEmpresasFalso()
      ..respuestaAlListar = const Rechazo(sinSesion, 'Inicia sesión otra vez');
    await ControladorDeEmpresas(repositorio, alPerderSesion: () => perdida = true).cargar();
    expect(perdida, isTrue);
  });

  test('sin conexión lo dice y deja reintentar', () async {
    final repositorio = RepositorioDeEmpresasFalso([panaderia])
      ..respuestaAlListar = const Rechazo(Rechazo.sinConexion, 'Sin conexión');
    final c = ControladorDeEmpresas(repositorio);
    await c.cargar();
    expect((c.paso, c.aviso), (PasoDeEmpresas.sinConexion, 'Sin conexión'));
    repositorio.respuestaAlListar = null;
    await c.cargar();
    expect(c.paso, PasoDeEmpresas.adentro);
  });
}
