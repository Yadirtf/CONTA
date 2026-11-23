import 'package:conta_app/nucleo/tema/tema_conta.dart';
import 'package:conta_app/nucleo/tema/tokens_conta.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  test('el tema claro usa el acento para la acción y la estructura en la barra superior', () {
    final tema = TemaConta.claro;
    expect(tema.colorScheme.brightness, Brightness.light);
    expect(tema.colorScheme.primary, PaletaConta.claro.acento);
    expect(tema.colorScheme.onPrimary, PaletaConta.claro.sobreAcento);
    expect(tema.appBarTheme.backgroundColor, PaletaConta.claro.estructura);
    expect(tema.scaffoldBackgroundColor, PaletaConta.claro.fondo);
  });

  test('el tema oscuro sale de la paleta oscura', () {
    final tema = TemaConta.oscuro;
    expect(tema.colorScheme.brightness, Brightness.dark);
    expect(tema.colorScheme.primary, PaletaConta.oscuro.acento);
    expect(tema.colorScheme.error, PaletaConta.oscuro.error);
  });

  test('el botón principal mide al menos 56 dp de alto', () {
    final estilo = TemaConta.claro.filledButtonTheme.style!;
    expect(estilo.minimumSize!.resolve({})!.height, greaterThanOrEqualTo(AlturaConta.botonPrincipal));
  });
}
