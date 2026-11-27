/// En qué va compartir una factura, con palabras del modo simple (HU-06.08).
final class EstadoDeCompartir {
  const EstadoDeCompartir.descargando() : tipo = TipoDeEstado.descargando, mensaje = 'Preparando la factura…';
  const EstadoDeCompartir.enCola(this.mensaje) : tipo = TipoDeEstado.enCola;
  const EstadoDeCompartir.fallo(this.mensaje) : tipo = TipoDeEstado.fallo;

  final TipoDeEstado tipo;
  final String mensaje;

  /// Mientras se descarga o espera en la cola: un segundo toque no la pide otra vez.
  bool get ocupado => tipo != TipoDeEstado.fallo;

  /// Los rechazos que se arreglan solos esperando. Cualquier otro (sin permiso, rechazada…) se muestra y para.
  static EstadoDeCompartir? enColaPor(String codigo) => switch (codigo) {
    'sin-conexion' => const EstadoDeCompartir.enCola(
      'Sin internet. La factura queda en cola y se comparte sola cuando vuelva la señal.',
    ),
    'comprobante.en-camino' => const EstadoDeCompartir.enCola(
      'La DIAN todavía no la aprueba. Queda en cola y se comparte sola cuando la apruebe.',
    ),
    'comprobante.limite' => const EstadoDeCompartir.enCola(
      'Compartiste muchas facturas seguidas. Esta queda en cola y sale en un momento.',
    ),
    _ => null,
  };
}

enum TipoDeEstado { descargando, enCola, fallo }
