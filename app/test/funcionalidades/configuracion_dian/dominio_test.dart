import 'package:conta_app/funcionalidades/configuracion_dian/dominio/configuracion_dian.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/dominio/digito_de_verificacion.dart';
import 'package:conta_app/funcionalidades/configuracion_dian/dominio/pasos_de_configuracion.dart';
import 'package:test/test.dart';

import 'dobles.dart';

void main() {
  test('el dígito de verificación sale con el módulo 11 de la DIAN', () {
    expect(digitoDeVerificacion('900373076'), 4);
    expect(digitoDeVerificacion('900.373.076'), 4);
    expect(digitoDeVerificacion('800197268'), 4);
    expect(digitoDeVerificacion('12a4'), isNull);
  });

  test('sin nada guardado, faltan los tres pasos y el POS es opcional', () {
    expect(PasoDeConfiguracion.values.map((p) => estadoDe(p, sinNada)), [
      EstadoDelPaso.falta,
      EstadoDelPaso.falta,
      EstadoDelPaso.falta,
      EstadoDelPaso.opcional,
      EstadoDelPaso.opcional,
    ]);
  });

  test('lo que falta lo dice la API', () {
    const lista = ConfiguracionDian(
      datosFiscales: null,
      resoluciones: [],
      softwareFactura: null,
      softwarePos: null,
      siempreFactura: false,
      loQueFalta: LoQueFalta(puedeFacturar: true, posActivo: true, pendientes: {}),
    );
    expect(estadoDe(PasoDeConfiguracion.softwareFactura, lista), EstadoDelPaso.listo);
    expect(estadoDe(PasoDeConfiguracion.tiquetePos, lista), EstadoDelPaso.listo);
  });
}
