// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

export '../../../nucleo/pesos.dart';

/// Lo que la persona escribe como precio, al formato de la API: «10.000» → «10000», «2.500,50» → «2500.50».
/// En Colombia el punto separa miles y la coma los centavos. Solo cambia la forma: si queda algo que no es un
/// precio, devuelve null y la pantalla lo dice. La API vuelve a revisarlo todo.
String? precioParaLaApi(String escrito) {
  final limpio = escrito.replaceAll(RegExp(r'[\s$]'), '');
  final partes = limpio.split(',');
  if (partes.length > 2) return null;
  final enteros = partes.first.replaceAll('.', '');
  final centavos = partes.length == 2 ? partes.last : '';
  if (!RegExp(r'^\d{1,10}$').hasMatch(enteros) || !RegExp(r'^\d{0,2}$').hasMatch(centavos)) return null;
  return centavos.isEmpty ? enteros : '$enteros.$centavos';
}
