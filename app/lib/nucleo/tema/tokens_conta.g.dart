// Generado desde contratos/diseno/tokens.json con herramientas/diseno/tokens.mjs. No se edita a mano.

import 'dart:ui' show Color;

/// Colores de un modo (claro u oscuro). Los nombres dicen el papel, no el tono.
final class PaletaConta {
  const PaletaConta({
    required this.fondo,
    required this.superficie,
    required this.tarjeta,
    required this.borde,
    required this.bordeControl,
    required this.texto,
    required this.textoSuave,
    required this.estructura,
    required this.sobreEstructura,
    required this.acento,
    required this.sobreAcento,
    required this.foco,
    required this.exito,
    required this.exitoFondo,
    required this.error,
    required this.errorFondo,
    required this.advertencia,
    required this.advertenciaFondo,
    required this.pendiente,
    required this.pendienteFondo,
  });

  final Color fondo;
  final Color superficie;
  final Color tarjeta;
  final Color borde;
  final Color bordeControl;
  final Color texto;
  final Color textoSuave;
  final Color estructura;
  final Color sobreEstructura;
  final Color acento;
  final Color sobreAcento;
  final Color foco;
  final Color exito;
  final Color exitoFondo;
  final Color error;
  final Color errorFondo;
  final Color advertencia;
  final Color advertenciaFondo;
  final Color pendiente;
  final Color pendienteFondo;

  static const claro = PaletaConta(
    fondo: Color(0xFFF5F8F9),
    superficie: Color(0xFFEAF1F3),
    tarjeta: Color(0xFFFFFFFF),
    borde: Color(0xFFD3DEE2),
    bordeControl: Color(0xFF6E8790),
    texto: Color(0xFF0F1E24),
    textoSuave: Color(0xFF4B5F67),
    estructura: Color(0xFF0C4A5E),
    sobreEstructura: Color(0xFFFFFFFF),
    acento: Color(0xFF4F46E5),
    sobreAcento: Color(0xFFFFFFFF),
    foco: Color(0xFF4F46E5),
    exito: Color(0xFF00695C),
    exitoFondo: Color(0xFFE3F4EF),
    error: Color(0xFFA3123A),
    errorFondo: Color(0xFFFCEBEF),
    advertencia: Color(0xFF8A4B00),
    advertenciaFondo: Color(0xFFFFF3DC),
    pendiente: Color(0xFF54647C),
    pendienteFondo: Color(0xFFEEF1F5),
  );

  static const oscuro = PaletaConta(
    fondo: Color(0xFF0D171B),
    superficie: Color(0xFF13222A),
    tarjeta: Color(0xFF182A33),
    borde: Color(0xFF2B414B),
    bordeControl: Color(0xFF5F7A85),
    texto: Color(0xFFE4EEF1),
    textoSuave: Color(0xFF9FB3BA),
    estructura: Color(0xFF1B3E4A),
    sobreEstructura: Color(0xFFE4EEF1),
    acento: Color(0xFF8C93FF),
    sobreAcento: Color(0xFF0D171B),
    foco: Color(0xFF8C93FF),
    exito: Color(0xFF2DD4BF),
    exitoFondo: Color(0xFF0F2E2B),
    error: Color(0xFFFF7A8A),
    errorFondo: Color(0xFF3A1419),
    advertencia: Color(0xFFFBBF24),
    advertenciaFondo: Color(0xFF33270B),
    pendiente: Color(0xFF949CB0),
    pendienteFondo: Color(0xFF20262E),
  );
}

/// Escala de espaciado en dp (múltiplos de 4).
abstract final class EspacioConta {
  static const s1 = 4.0;
  static const s2 = 8.0;
  static const s3 = 12.0;
  static const s4 = 16.0;
  static const s6 = 24.0;
  static const s8 = 32.0;
  static const s12 = 48.0;
  static const s16 = 64.0;
}

/// Radios de esquina en dp.
abstract final class RadioConta {
  static const consola = 6.0;
  static const campo = 8.0;
  static const boton = 12.0;
  static const tarjeta = 16.0;
  static const hoja = 20.0;
  static const pildora = 999.0;
}

/// Alturas mínimas de toque en dp.
abstract final class AlturaConta {
  static const fila = 40.0;
  static const toque = 48.0;
  static const botonPrincipal = 56.0;
  static const producto = 72.0;
}

/// Tamaños de texto en sp.
abstract final class TextoConta {
  static const etiqueta = 13.0;
  static const pequeno = 15.0;
  static const cuerpo = 17.0;
  static const subtitulo = 20.0;
  static const titulo = 24.0;
  static const monto = 28.0;
  static const total = 36.0;
}

/// Tipografía y movimiento.
abstract final class EstiloConta {
  static const familia = 'Roboto';
  static const pesoNormal = 400;
  static const pesoMedio = 600;
  static const pesoFuerte = 700;
  static const duracionRapida = Duration(milliseconds: 120);
  static const duracionNormal = Duration(milliseconds: 200);
  static const duracionLenta = Duration(milliseconds: 320);
}
