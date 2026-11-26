import 'package:conta_app/funcionalidades/productos/dominio/productos.dart';
import 'package:test/test.dart';

void main() {
  test('el precio escrito a la colombiana queda como lo pide la API', () {
    expect(precioParaLaApi('10.000'), '10000');
    expect(precioParaLaApi(r'$ 2.500,50'), '2500.50');
    expect(precioParaLaApi('2500'), '2500');
    expect(precioParaLaApi('1,5'), '1.5');
    for (final malo in ['', 'abc', '1,234', '1,2,3', '-5', '1e3', '12345678901']) {
      expect(precioParaLaApi(malo), isNull, reason: malo);
    }
  });

  test('muestra pesos sin pasar por double', () {
    expect(pesos('10000.00'), r'$ 10.000');
    expect(pesos('8403.36'), r'$ 8.403,36');
    expect(pesos('1000000000.5'), r'$ 1.000.000.000,50');
    expect(pesos('0.00'), r'$ 0');
  });
}
