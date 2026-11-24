import 'package:conta_app/funcionalidades/acceso/dominio/acceso.dart';
import 'package:conta_app/funcionalidades/acceso/presentacion/controlador_de_acceso.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';

void main() {
  final hoy = DateTime.utc(2026, 11, 23, 15);
  late RepositorioDeAccesoFalso api;
  late AlmacenEnMemoria almacen;
  late ControladorDeAcceso controlador;

  setUp(() {
    api = RepositorioDeAccesoFalso();
    almacen = AlmacenEnMemoria();
    controlador = ControladorDeAcceso(api, almacen, reloj: () => hoy);
  });

  test('sin sesión empieza pidiendo el celular; con una vigente entra directo', () async {
    await controlador.iniciar();
    expect(controlador.paso, PasoDeAcceso.celular);

    almacen.sesion = SesionGuardada(token: 'x', venceEn: hoy.add(const Duration(days: 1)), celular: '+573001234567');
    await controlador.iniciar();
    expect(controlador.paso, PasoDeAcceso.adentro);
  });

  test('una sesión vencida se borra del dispositivo', () async {
    almacen.sesion = SesionGuardada(token: 'x', venceEn: hoy, celular: '+573001234567');
    await controlador.iniciar();
    expect(controlador.paso, PasoDeAcceso.celular);
    expect(almacen.sesion, isNull);
  });

  test('un celular mal escrito no viaja a la API', () async {
    await controlador.pedirCodigo('12345');
    expect(api.pedidos, isEmpty);
    expect(controlador.aviso, contains('10 números'));
  });

  test('pide el código, entra y guarda la sesión en el almacén', () async {
    await controlador.pedirCodigo('300 123 4567');
    expect(api.pedidos, ['3001234567']);
    expect(controlador.paso, PasoDeAcceso.codigo);

    await controlador.entrar('123456');
    expect(controlador.paso, PasoDeAcceso.adentro);
    expect(almacen.sesion?.celular, '+573001234567');
  });

  test('un código incorrecto dice cuántos intentos quedan', () async {
    await controlador.pedirCodigo('3001234567');
    await controlador.entrar('000000');
    expect(controlador.paso, PasoDeAcceso.codigo);
    expect(controlador.aviso, 'El código no coincide. Te quedan 4 intentos.');
  });

  test('si ya se envió un código hace poco, pasa al paso del código con la espera', () async {
    final desde = hoy.add(const Duration(seconds: 40));
    api.respuestaAlPedir = Rechazo('acceso.espera', 'Ya te enviamos un código.', reintentarDesde: desde);
    await controlador.pedirCodigo('3001234567');
    expect(controlador.paso, PasoDeAcceso.codigo);
    expect(controlador.otroCodigoDesde, desde);
  });

  test('salir borra la sesión del dispositivo y la cierra en la API', () async {
    await controlador.pedirCodigo('3001234567');
    await controlador.entrar('123456');
    await controlador.salir();
    expect(controlador.paso, PasoDeAcceso.celular);
    expect(almacen.sesion, isNull);
    expect(api.salidas, hasLength(1));
  });
}
