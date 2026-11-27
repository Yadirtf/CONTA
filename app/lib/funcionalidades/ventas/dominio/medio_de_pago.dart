// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// Cómo pagó el comprador (HU-06.01), con el valor que acepta la API. Nequi y Daviplata son transferencias.
/// El fiado llega con la cartera (EP-12).
enum MedioDePago {
  efectivo('efectivo', 'Efectivo'),
  transferencia('transferencia', 'Nequi, Daviplata o transferencia'),
  tarjetaDebito('tarjeta-debito', 'Tarjeta débito'),
  tarjetaCredito('tarjeta-credito', 'Tarjeta crédito');

  const MedioDePago(this.valor, this.nombre);

  final String valor;
  final String nombre;
}
