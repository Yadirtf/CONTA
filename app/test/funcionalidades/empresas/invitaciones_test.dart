import 'package:conta_app/funcionalidades/empresas/dominio/empresas.dart';
import 'package:conta_app/funcionalidades/empresas/presentacion/controlador_de_empresas.dart';
import 'package:test/test.dart';

import 'dobles.dart';

final _invitacion = Empresa(id: 'e-inv', razonSocial: 'Tienda Doña Rosa', membresia: membresiaDe(Rol.cajero, invitada: true));

void main() {
  test('con una sola empresa, pero invitada, no entra: pide aceptar primero', () async {
    final c = ControladorDeEmpresas(RepositorioDeEmpresasFalso([_invitacion]));
    await c.cargar();
    expect((c.paso, c.elegida), (PasoDeEmpresas.elegir, null));
    c.elegir(_invitacion);
    expect(c.elegida, isNull);
  });

  test('al aceptar, la lista vuelve con el negocio como suyo y entra a él', () async {
    final repositorio = RepositorioDeEmpresasFalso([_invitacion]);
    final c = ControladorDeEmpresas(repositorio);
    await c.cargar();
    await c.responder(_invitacion, aceptar: true);
    expect(repositorio.respuestas, ['e-inv:aceptar']);
    expect(c.paso, PasoDeEmpresas.adentro);
    expect(c.elegida?.membresia?.rol, Rol.cajero);
  });

  test('al rechazar, el negocio desaparece de la lista', () async {
    final repositorio = RepositorioDeEmpresasFalso([panaderia, _invitacion]);
    final c = ControladorDeEmpresas(repositorio);
    await c.cargar();
    await c.responder(_invitacion, aceptar: false);
    expect(c.empresas, [panaderia]);
  });

  test('si la API rechaza la respuesta, queda el aviso', () async {
    final c = ControladorDeEmpresas(RepositorioDeEmpresasFalso([panaderia, ferreteria]));
    await c.cargar();
    await c.responder(panaderia, aceptar: true);
    expect(c.aviso, 'No tienes una invitación pendiente en esta empresa');
  });

  test('la membresía dice qué puede cada rol y cómo se describe', () {
    expect(membresiaDe(Rol.cajero).puede(Permiso.verInformes), isFalse);
    expect(membresiaDe(Rol.cajero).puede(Permiso.anularDocumentos), isFalse);
    expect(membresiaDe(Rol.dueno).puede(Permiso.gestionarMiembros), isTrue);
    expect(membresiaDe(Rol.contador).descripcion, 'Contador · modo contador');
  });
}
