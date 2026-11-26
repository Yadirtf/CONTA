import 'package:conta_app/funcionalidades/miembros/dominio/miembros.dart';
import 'package:conta_app/funcionalidades/miembros/presentacion/controlador_de_miembros.dart';
import 'package:test/test.dart';

import 'dobles.dart';

void main() {
  test('carga las personas del negocio pidiéndolas dentro de él', () async {
    final repositorio = RepositorioDeMiembrosFalso([dueno, cajera]);
    final c = ControladorDeMiembros(repositorio, 'e-pan');
    await c.cargar();
    expect(c.cargando, isFalse);
    expect(c.miembros, [dueno, cajera]);
    expect(repositorio.empresasPedidas, ['e-pan']);
  });

  test('invita con solo los dígitos del celular y la suma como invitada', () async {
    final repositorio = RepositorioDeMiembrosFalso([dueno]);
    final c = ControladorDeMiembros(repositorio, 'e-pan');
    await c.cargar();
    expect(await c.invitar('300 123-4567', Rol.cajero), isTrue);
    expect(c.miembros.last, const Miembro(usuarioId: 'u-3001234567', celular: '+57 300 *** 4567', rol: Rol.cajero, invitado: true));
  });

  test('un celular vacío no se envía; un rechazo de la API queda como aviso', () async {
    final repositorio = RepositorioDeMiembrosFalso([dueno])
      ..rechazoAlInvitar = const Rechazo('permiso.denegado', 'No tienes permiso');
    final c = ControladorDeMiembros(repositorio, 'e-pan');
    expect(await c.invitar('  ', Rol.cajero), isFalse);
    expect(repositorio.empresasPedidas, isEmpty);
    expect(await c.invitar('3001234567', Rol.dueno), isFalse);
    expect(c.aviso, 'No tienes permiso');
  });

  test('retirar quita a la persona de la lista', () async {
    final c = ControladorDeMiembros(RepositorioDeMiembrosFalso([dueno, cajera]), 'e-pan');
    await c.cargar();
    await c.retirar(cajera);
    expect(c.miembros, [dueno]);
  });
}
