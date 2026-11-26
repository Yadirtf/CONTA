import 'package:conta_app/funcionalidades/verificacion/dominio/verificacion.dart';
import 'package:conta_app/funcionalidades/verificacion/presentacion/controlador_de_verificacion.dart';
import 'package:test/test.dart';

import 'dobles.dart';

void main() {
  test('con la sesión ya verificada entra sin pedir nada', () async {
    final c = ControladorDeVerificacion(RepositorioDeVerificacionFalso(appConfigurada: true, sesionVerificada: true));
    await c.cargar();
    expect(c.paso, PasoDeVerificacion.listo);
  });

  test('la primera vez pide la clave, confirma y muestra los códigos de recuperación una sola vez', () async {
    final c = ControladorDeVerificacion(RepositorioDeVerificacionFalso());
    await c.cargar();
    expect(c.paso, PasoDeVerificacion.configurar);
    expect(c.app?.claveLegible, 'JBSW Y3DP EHPK 3PXP');

    await c.confirmar('000000');
    expect(c.paso, PasoDeVerificacion.configurar);
    expect(c.aviso, 'El código no coincide.');

    await c.confirmar(' ${RepositorioDeVerificacionFalso.codigoBueno} ');
    expect(c.paso, PasoDeVerificacion.guardarCodigos);
    expect(c.app, isNull);
    expect(c.codigosDeRecuperacion, RepositorioDeVerificacionFalso.recuperacion);

    c.codigosGuardados();
    expect(c.paso, PasoDeVerificacion.listo);
    expect(c.codigosDeRecuperacion, isEmpty);
  });

  test('con la app configurada pide el código; acepta uno de recuperación', () async {
    final repositorio = RepositorioDeVerificacionFalso(appConfigurada: true);
    final c = ControladorDeVerificacion(repositorio);
    await c.cargar();
    expect(c.paso, PasoDeVerificacion.verificar);
    await c.verificar('   ');
    expect(repositorio.codigosEnviados, isEmpty);
    expect(c.aviso, isNotNull);
    await c.verificar('ABCDE-FGHJK');
    expect(c.paso, PasoDeVerificacion.listo);
  });

  test('sin sesión avisa a quien la maneja; sin conexión deja reintentar', () async {
    var perdida = false;
    final sinSesion = RepositorioDeVerificacionFalso()..rechazoAlConsultar = const Rechazo('acceso.sin-sesion', 'Inicia sesión');
    await ControladorDeVerificacion(sinSesion, alPerderSesion: () => perdida = true).cargar();
    expect(perdida, isTrue);

    final caida = RepositorioDeVerificacionFalso()..rechazoAlConsultar = const Rechazo(Rechazo.sinConexion, 'Sin conexión');
    final c = ControladorDeVerificacion(caida);
    await c.cargar();
    expect(c.paso, PasoDeVerificacion.sinConexion);
    caida.rechazoAlConsultar = null;
    await c.cargar();
    expect(c.paso, PasoDeVerificacion.configurar);
  });
}
