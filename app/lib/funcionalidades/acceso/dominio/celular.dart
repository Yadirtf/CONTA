// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.
// Ayuda a escribir el celular. La regla que vale es la de la API (HU-04.01): esto solo evita viajes inútiles.

final _separadores = RegExp(r'[\s().-]');
final _movilColombiano = RegExp(r'^3\d{9}$');

/// Los 10 dígitos del celular, o null si no es un móvil de Colombia. Acepta espacios y +57.
String? celularNormalizado(String texto) {
  final digitos = texto.replaceAll(_separadores, '').replaceFirst(RegExp(r'^\+?57(?=\d{10}$)'), '');
  return _movilColombiano.hasMatch(digitos) ? digitos : null;
}

/// 3001234567 → 300 123 4567, como se dice en voz alta.
String celularLegible(String diezDigitos) =>
    '${diezDigitos.substring(0, 3)} ${diezDigitos.substring(3, 6)} ${diezDigitos.substring(6)}';
