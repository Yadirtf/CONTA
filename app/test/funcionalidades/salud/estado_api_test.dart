import 'package:conta_app/funcionalidades/salud/dominio/estado_api.dart';
import 'package:test/test.dart';

void main() {
  test('muestra la versión cuando el servidor responde', () {
    expect(mensajeDeEstado(const ApiViva('0.1.0')), 'Conectado (versión 0.1.0).');
  });

  test('usa palabras sencillas cuando no hay conexión', () {
    expect(mensajeDeEstado(const ApiSinRespuesta()), contains('Sin conexión'));
  });
}
