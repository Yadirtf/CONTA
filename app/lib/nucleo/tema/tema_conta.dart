import 'package:material_ui/material_ui.dart';

import 'paleta_del_tema.dart';
import 'tokens_conta.g.dart';

export 'paleta_del_tema.dart' show PaletaDelContexto;
export 'tokens_conta.g.dart';

/// Tema de la app a partir de los tokens compartidos (ADR-0009).
/// 60 % fondo y tarjetas, 30 % estructura (barra superior), 10 % acento (la acción principal).
/// Los colores de estado no entran al ColorScheme salvo `error`: se leen de [PaletaConta].
abstract final class TemaConta {
  static ThemeData get claro => _tema(PaletaConta.claro, Brightness.light);
  static ThemeData get oscuro => _tema(PaletaConta.oscuro, Brightness.dark);

  static ThemeData _tema(PaletaConta p, Brightness brillo) {
    final esquema = ColorScheme(
      brightness: brillo,
      primary: p.acento,
      onPrimary: p.sobreAcento,
      secondary: p.estructura,
      onSecondary: p.sobreEstructura,
      error: p.error,
      onError: brillo == Brightness.light ? p.tarjeta : p.fondo,
      surface: p.tarjeta,
      onSurface: p.texto,
      onSurfaceVariant: p.textoSuave,
      outline: p.bordeControl,
      outlineVariant: p.borde,
    );
    final forma = RoundedRectangleBorder(borderRadius: BorderRadius.circular(RadioConta.boton));
    return ThemeData(
      colorScheme: esquema,
      scaffoldBackgroundColor: p.fondo,
      extensions: [PaletaDelTema(p)],
      fontFamily: EstiloConta.familia,
      appBarTheme: AppBarTheme(backgroundColor: p.estructura, foregroundColor: p.sobreEstructura),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(AlturaConta.toque, AlturaConta.botonPrincipal),
          shape: forma,
          textStyle: const TextStyle(fontSize: TextoConta.subtitulo, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.tarjeta,
        contentPadding: const EdgeInsets.symmetric(horizontal: EspacioConta.s4, vertical: EspacioConta.s4),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(RadioConta.campo)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(RadioConta.campo),
          borderSide: BorderSide(color: p.bordeControl),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(RadioConta.campo),
          borderSide: BorderSide(color: p.foco, width: 2),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: p.acento,
          // Desactivado sigue legible: no hay gris más claro que textoSuave (sistema de diseño, 2.2).
          disabledForegroundColor: p.textoSuave,
          minimumSize: const Size(AlturaConta.toque, AlturaConta.toque),
        ),
      ),
      cardTheme: CardThemeData(
        color: p.tarjeta,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RadioConta.tarjeta),
          side: BorderSide(color: p.borde),
        ),
      ),
    );
  }
}
