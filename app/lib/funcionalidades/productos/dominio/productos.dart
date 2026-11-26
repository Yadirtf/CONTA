// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

import '../../../nucleo/respuesta.dart';
import 'producto.dart';

export '../../../nucleo/respuesta.dart';
export 'precio_escrito.dart';
export 'producto.dart';

/// Contrato con la API de productos. Todo se pide dentro de un negocio (X-Empresa).
abstract interface class RepositorioDeProductos {
  /// Por parte del nombre o el comienzo del código; vacío, los primeros 50 por nombre.
  Future<Respuesta<List<Producto>>> buscar(String empresaId, String texto);

  /// Crea el producto. Solo pueden el dueño y el contador; al cajero la API le responde «No tienes permiso».
  Future<Respuesta<Producto>> crear(String empresaId, ProductoNuevo nuevo);
}
