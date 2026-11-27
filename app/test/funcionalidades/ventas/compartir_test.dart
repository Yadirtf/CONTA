import 'dart:async';

import 'package:conta_app/funcionalidades/ventas/dominio/ventas.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/cola_de_comprobantes.dart';
import 'package:conta_app/funcionalidades/ventas/presentacion/estado_de_compartir.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dobles.dart';

const _enCamino = Rechazo<Never>('comprobante.en-camino', 'Todavía va para la DIAN');
const _sinConexion = Rechazo<Never>(Rechazo.sinConexion, 'Sin conexión');

/// Esperas que no terminan hasta [soltar]: deja ver la cola mientras espera.
class EsperaControlada {
  final _pendientes = <Completer<void>>[];

  Future<void> esperar(Duration _) => (_pendientes..add(Completer())).last.future;

  void soltar() {
    for (final c in _pendientes) {
      c.complete();
    }
    _pendientes.clear();
  }
}

void main() {
  group('ColaDeComprobantes (HU-06.08)', () {
    test('comparte el PDF como archivo con el nombre y el texto de la factura', () async {
      final api = RepositorioDeVentasFalso();
      final compartidor = CompartidorFalso();
      await colaDePrueba(api, compartidor).compartir('e1', 'v1', 'SETP990000001');

      final c = compartidor.compartidos.single;
      expect(c.nombreDeArchivo, 'factura-SETP990000001.pdf');
      expect(c.texto, 'Factura electrónica SETP990000001');
      expect(c.pdf, pdfDePrueba);
      expect(api.pedidosDeComprobante, ['v1']);
    });

    test('sin internet o mientras la DIAN no aprueba queda en cola y se comparte sola al llegar', () async {
      final api = RepositorioDeVentasFalso()..comprobantes = [_sinConexion, _enCamino, Exito(pdfDePrueba)];
      final compartidor = CompartidorFalso();
      final cola = colaDePrueba(api, compartidor);
      final vistos = <String?>[];
      cola.addListener(() => vistos.add(cola.estadoDe('v1')?.mensaje));

      await cola.compartir('e1', 'v1', 'SETP990000001');

      expect(api.pedidosDeComprobante, hasLength(3));
      expect(compartidor.compartidos, hasLength(1));
      expect(vistos, contains(startsWith('Sin internet. La factura queda en cola')));
      expect(vistos, contains(startsWith('La DIAN todavía no la aprueba')));
      expect(cola.estadoDe('v1'), isNull);
    });

    test('mientras espera, un segundo toque no la pide otra vez', () async {
      final api = RepositorioDeVentasFalso()..comprobantes = [_sinConexion, Exito(pdfDePrueba)];
      final compartidor = CompartidorFalso();
      final espera = EsperaControlada();
      final cola = ColaDeComprobantes(api, compartidor, esperar: espera.esperar);
      final primero = cola.compartir('e1', 'v1', 'N1');
      await Future<void>.delayed(Duration.zero);
      expect(cola.estadoDe('v1')?.tipo, TipoDeEstado.enCola);
      await cola.compartir('e1', 'v1', 'N1');
      espera.soltar();
      await primero;
      expect(api.pedidosDeComprobante, hasLength(2));
      expect(compartidor.compartidos, hasLength(1));
    });

    test('se rinde tras los reintentos y deja volver a intentar', () async {
      final api = RepositorioDeVentasFalso()..comprobantes = [_sinConexion];
      final cola = colaDePrueba(api, CompartidorFalso());
      await cola.compartir('e1', 'v1', 'N1');
      expect(api.pedidosDeComprobante, hasLength(cola.esperas.length + 1));
      expect(cola.estadoDe('v1')?.tipo, TipoDeEstado.fallo);
      expect(cola.estadoDe('v1')?.ocupado, isFalse);
    });

    test('un rechazo que no se arregla esperando se muestra sin reintentar', () async {
      final api = RepositorioDeVentasFalso()
        ..comprobantes = [const Rechazo('permiso.denegado', 'No tienes permiso para esto')];
      final cola = colaDePrueba(api, CompartidorFalso());
      await cola.compartir('e1', 'v1', 'N1');
      expect(api.pedidosDeComprobante, hasLength(1));
      expect(cola.estadoDe('v1')?.mensaje, 'No tienes permiso para esto');
    });

    test('si el teléfono no abre el menú, lo dice', () async {
      final cola = colaDePrueba(RepositorioDeVentasFalso(), CompartidorFalso()..falla = true);
      await cola.compartir('e1', 'v1', 'N1');
      expect(cola.estadoDe('v1')?.mensaje, startsWith('El teléfono no pudo abrir'));
    });

    test('no deja más de 10 facturas esperando a la vez', () async {
      final api = RepositorioDeVentasFalso()..comprobantes = [_sinConexion];
      final cola = ColaDeComprobantes(api, CompartidorFalso(), esperar: EsperaControlada().esperar);
      for (var i = 0; i < 10; i++) {
        unawaited(cola.compartir('e1', 'v$i', 'N$i'));
      }
      await Future<void>.delayed(Duration.zero);
      await cola.compartir('e1', 'v10', 'N10');
      expect(cola.estadoDe('v10')?.mensaje, 'Hay muchas facturas esperando. Intenta en un rato.');
      expect(api.pedidosDeComprobante, hasLength(10));
      cola.dispose();
    });
  });
}
