import 'package:material_ui/material_ui.dart';

import 'tokens_conta.g.dart';

/// La paleta del modo activo (claro u oscuro) dentro del tema, para que una pantalla pida un color por su
/// papel (`context.paleta.exito`) y nunca escriba uno. Cambiar un color es cambiar contratos/diseno/tokens.json.
final class PaletaDelTema extends ThemeExtension<PaletaDelTema> {
  const PaletaDelTema(this.paleta);

  final PaletaConta paleta;

  @override
  PaletaDelTema copyWith({PaletaConta? paleta}) => PaletaDelTema(paleta ?? this.paleta);

  /// Los colores de marca no se mezclan: al cambiar de modo se pasa de una paleta a la otra.
  @override
  PaletaDelTema lerp(PaletaDelTema? otra, double t) => t < 0.5 || otra == null ? this : otra;
}

extension PaletaDelContexto on BuildContext {
  PaletaConta get paleta => Theme.of(this).extension<PaletaDelTema>()?.paleta ?? PaletaConta.claro;
}
