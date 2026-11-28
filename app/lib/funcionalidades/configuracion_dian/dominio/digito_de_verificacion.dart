// Dominio de la funcionalidad: Dart puro.

/// Dígito de verificación del NIT (módulo 11 de la DIAN), para mostrarlo mientras se escribe. La API lo
/// vuelve a calcular: este solo ayuda al dueño a ver que el NIT coincide con su RUT. null si no es un NIT.
int? digitoDeVerificacion(String nit) {
  final limpio = nit.replaceAll(RegExp(r'[\s.]'), '');
  if (!RegExp(r'^\d{5,15}$').hasMatch(limpio)) return null;
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  var suma = 0;
  for (var i = 0; i < limpio.length; i++) {
    suma += int.parse(limpio[limpio.length - 1 - i]) * pesos[i];
  }
  final resto = suma % 11;
  return resto > 1 ? 11 - resto : resto;
}
