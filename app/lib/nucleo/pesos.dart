// Dart puro: lo usan los dominios de productos y ventas para mostrar montos de la API.

/// «8403.36» → «$ 8.403,36»; «10000.00» → «$ 10.000». Muestra lo que manda la API, sin pasar por double.
String pesos(String monto) {
  final partes = monto.split('.');
  final enteros = partes.first;
  final grupos = <String>[];
  for (var fin = enteros.length; fin > 0; fin -= 3) {
    grupos.insert(0, enteros.substring(fin < 3 ? 0 : fin - 3, fin));
  }
  final decimales = partes.length == 2 ? partes.last.padRight(2, '0') : '00';
  final centavos = decimales == '00' ? '' : ',$decimales';
  return '\$ ${grupos.join('.')}$centavos';
}
