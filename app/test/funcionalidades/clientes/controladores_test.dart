import 'package:conta_app/funcionalidades/clientes/dominio/clientes.dart';
import 'package:conta_app/funcionalidades/clientes/presentacion/controlador_de_busqueda.dart';
import 'package:conta_app/funcionalidades/clientes/presentacion/controlador_de_comprador_nuevo.dart';
import 'package:conta_app/nucleo/id_nuevo.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';

void main() {
  group('ControladorDeBusqueda', () {
    test('no busca con menos de 3 caracteres y limpia puntos y guion antes de buscar', () async {
      final api = RepositorioDeClientesFalso([ferreteria]);
      final c = ControladorDeBusqueda(api, 'e1', espera: Duration.zero);
      c.alEscribir('80');
      expect(c.puedeBuscar, isFalse);
      c.alEscribir('800.197.268-4');
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(api.busquedas, ['800197268']);
      expect(c.resultado?.compradores, [ferreteria]);
      expect(c.resultado?.nit.toString(), '800197268-7');
    });

    test('solo cuenta la última búsqueda: escribir rápido no pide una por tecla', () async {
      final api = RepositorioDeClientesFalso([ferreteria]);
      final c = ControladorDeBusqueda(api, 'e1', espera: const Duration(milliseconds: 20));
      for (final texto in ['800', '8001', '80019']) {
        c.alEscribir(texto);
      }
      await Future<void>.delayed(const Duration(milliseconds: 60));
      expect(api.busquedas, ['80019']);
    });

    test('consumidor final en un toque', () async {
      final c = ControladorDeBusqueda(RepositorioDeClientesFalso(), 'e1');
      expect((await c.consumidorFinal())?.esConsumidorFinal, isTrue);
    });
  });

  group('ControladorDeCompradorNuevo', () {
    Future<Comprador?> guardar(ControladorDeCompradorNuevo c, {String numero = '1020304050', String nombre = 'Rosa'}) => c.guardar(
      tipo: TipoDeDocumento.cedula,
      numero: numero,
      nombre: nombre,
      tipoDePersona: TipoDePersona.natural,
      responsableDeIva: true,
      responsabilidades: ' o-13, O-15 ',
      correo: '',
    );

    test('pide documento y nombre antes de llamar a la API', () async {
      final api = RepositorioDeClientesFalso();
      final c = ControladorDeCompradorNuevo(api, 'e1');
      expect(await guardar(c, nombre: ' '), isNull);
      expect(c.aviso, contains('nombre'));
      expect(api.creados, isEmpty);
    });

    test('reintentar después de un fallo usa el mismo id: la API no crea dos', () async {
      final api = RepositorioDeClientesFalso()..rechazoAlCrear = const Rechazo(Rechazo.sinConexion, 'Sin conexión');
      final c = ControladorDeCompradorNuevo(api, 'e1');
      expect(await guardar(c), isNull);
      expect(c.aviso, 'Sin conexión');
      expect(await guardar(c), isNotNull);
      expect(api.creados.map((n) => n.id).toSet(), {c.id});
    });

    test('limpia las responsabilidades y solo marca IVA con NIT', () async {
      final api = RepositorioDeClientesFalso();
      await guardar(ControladorDeCompradorNuevo(api, 'e1'));
      expect(api.creados.single.responsabilidadesFiscales, ['O-13', 'O-15']);
      expect(api.creados.single.responsableDeIva, isFalse);
      expect(api.creados.single.correo, isNull);
    });
  });

  test('idNuevo da un UUID v4 en minúsculas, distinto cada vez', () {
    final ids = List.generate(50, (_) => idNuevo());
    expect(ids.toSet(), hasLength(50));
    expect(ids, everyElement(matches(RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'))));
  });
}
