// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// «2500.00» → 250000 centavos. Exacto, con BigInt: la app nunca suma plata con double. Lanza
/// FormatException si el texto no es un monto de la API.
BigInt centavosDe(String monto) {
  final coincidencia = RegExp(r'^(\d{1,13})(?:\.(\d{1,2}))?$').firstMatch(monto);
  if (coincidencia == null) throw FormatException('Monto inválido', monto);
  final centavos = (coincidencia.group(2) ?? '').padRight(2, '0');
  return BigInt.parse(coincidencia.group(1)!) * BigInt.from(100) + BigInt.parse(centavos);
}

/// 250000 centavos → «2500.00», el mismo formato de la API.
String montoDe(BigInt centavos) {
  final cien = BigInt.from(100);
  return '${centavos ~/ cien}.${(centavos % cien).toString().padLeft(2, '0')}';
}
