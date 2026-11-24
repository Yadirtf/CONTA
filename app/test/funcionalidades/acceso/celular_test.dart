import 'package:conta_app/funcionalidades/acceso/dominio/celular.dart';
import 'package:test/test.dart';

void main() {
  test('normaliza el celular como lo escribe la gente', () {
    for (final texto in ['3001234567', '300 123 4567', '+57 300 123 4567', '573001234567']) {
      expect(celularNormalizado(texto), '3001234567', reason: texto);
    }
  });

  test('rechaza lo que no es un móvil de Colombia', () {
    for (final texto in ['', '6011234567', '30012345', 'tres']) {
      expect(celularNormalizado(texto), isNull, reason: texto);
    }
  });

  test('se lee en grupos de 3, 3 y 4', () => expect(celularLegible('3001234567'), '300 123 4567'));
}
