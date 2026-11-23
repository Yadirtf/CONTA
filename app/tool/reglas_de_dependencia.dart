// Reglas de dependencia de la app (HU-01.02). Fuente: Docs/arquitectura/arquitectura-limpia.md, sección 3.
// Uso: dart run tool/reglas_de_dependencia.dart   (sale con código 1 si hay violaciones)
// Una excepción solo se admite con un ADR aprobado y se anota aquí junto al número del ADR.
import 'dart:io';

const nombrePaquete = 'conta_app';

class Regla {
  const Regla(this.nombre, this.explicacion);
  final String nombre;
  final String explicacion;
}

const dominioSinFrameworks = Regla(
  'dominio-sin-frameworks',
  'El dominio es Dart puro: no importa package:flutter, material_ui, dio, http, drift ni riverpod, '
      'ni dart:io, dart:ui o dart:html.',
);
const dominioSinOtrasCapas = Regla('dominio-sin-otras-capas', 'El dominio no depende de datos/ ni de presentacion/.');
const funcionalidadSinDatosAjenos = Regla(
  'funcionalidad-sin-datos-ajenos',
  'Una funcionalidad no importa los datos/ de otra funcionalidad; usa su dominio o la API.',
);

/// Paquetes que el dominio sí puede usar (puros, sin plataforma).
const paquetesPermitidosEnDominio = <String>{'meta', 'collection'};
const librariasDartProhibidasEnDominio = <String>{'dart:io', 'dart:ui', 'dart:html', 'dart:js_interop', 'dart:ffi'};

class Violacion {
  const Violacion(this.regla, this.archivo, this.importa);
  final Regla regla;
  final String archivo;
  final String importa;

  @override
  String toString() => 'error ${regla.nombre}: $archivo → $importa\n  ${regla.explicacion}';
}

final _directiva = RegExp(r'''^\s*(?:import|export)\s+['"]([^'"]+)['"]''', multiLine: true);

/// Revisa los archivos dados (ruta relativa a la raíz de la app, con "/", → contenido).
List<Violacion> revisar(Map<String, String> archivos) {
  final violaciones = <Violacion>[];
  for (final entrada in archivos.entries) {
    final archivo = entrada.key;
    if (!archivo.startsWith('lib/')) continue;
    final enDominio = _capa(archivo) == 'dominio';
    final funcionalidad = _funcionalidad(archivo);
    for (final m in _directiva.allMatches(entrada.value)) {
      final uri = m.group(1)!;
      if (uri.startsWith('dart:')) {
        if (enDominio && librariasDartProhibidasEnDominio.contains(uri)) {
          violaciones.add(Violacion(dominioSinFrameworks, archivo, uri));
        }
        continue;
      }
      final destino = _resolver(archivo, uri);
      if (destino == null) {
        final paquete = uri.substring('package:'.length).split('/').first;
        if (enDominio && !paquetesPermitidosEnDominio.contains(paquete)) {
          violaciones.add(Violacion(dominioSinFrameworks, archivo, uri));
        }
        continue;
      }
      final capaDestino = _capa(destino);
      if (enDominio && (capaDestino == 'datos' || capaDestino == 'presentacion')) {
        violaciones.add(Violacion(dominioSinOtrasCapas, archivo, uri));
      }
      final funcionalidadDestino = _funcionalidad(destino);
      // main.dart y app.dart (composición) sí pueden armar los datos de cada funcionalidad.
      if (capaDestino == 'datos' &&
          funcionalidad != null &&
          funcionalidadDestino != null &&
          funcionalidadDestino != funcionalidad) {
        violaciones.add(Violacion(funcionalidadSinDatosAjenos, archivo, uri));
      }
    }
  }
  return violaciones;
}

/// Devuelve la ruta dentro de la app ("lib/...") o null si es un paquete externo.
String? _resolver(String archivo, String uri) {
  if (uri.startsWith('package:')) {
    final resto = uri.substring('package:'.length);
    return resto.startsWith('$nombrePaquete/') ? 'lib/${resto.substring(nombrePaquete.length + 1)}' : null;
  }
  final partes = archivo.split('/')..removeLast();
  for (final segmento in uri.split('/')) {
    if (segmento == '..') {
      if (partes.isNotEmpty) partes.removeLast();
    } else if (segmento != '.') {
      partes.add(segmento);
    }
  }
  return partes.join('/');
}

String? _capa(String ruta) {
  for (final capa in const ['dominio', 'datos', 'presentacion']) {
    if (ruta.contains('/$capa/')) return capa;
  }
  return null;
}

String? _funcionalidad(String ruta) {
  final m = RegExp(r'^lib/funcionalidades/([^/]+)/').firstMatch(ruta);
  return m?.group(1);
}

void main() {
  final archivos = <String, String>{};
  for (final f in Directory('lib').listSync(recursive: true).whereType<File>()) {
    if (f.path.endsWith('.dart')) archivos[f.path.replaceAll(r'\', '/')] = f.readAsStringSync();
  }
  final violaciones = revisar(archivos);
  if (violaciones.isEmpty) {
    stdout.writeln('✔ Sin violaciones de dependencia (${archivos.length} archivos revisados).');
    return;
  }
  violaciones.forEach(stderr.writeln);
  stderr.writeln('\n✘ ${violaciones.length} violaciones de dependencia.');
  exitCode = 1;
}
