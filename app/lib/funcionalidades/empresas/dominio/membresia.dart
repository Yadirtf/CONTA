// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// Papel de la persona en el negocio (HU-04.03). Lo decide la API; la app solo lo muestra.
enum Rol {
  dueno('dueno', 'Dueño'),
  contador('contador', 'Contador'),
  cajero('cajero', 'Cajero');

  const Rol(this.codigo, this.nombre);

  /// Como lo escribe la API.
  final String codigo;

  /// Como lo lee la persona.
  final String nombre;

  static Rol? de(Object? codigo) => values.where((r) => r.codigo == codigo).firstOrNull;
}

/// Cara con que se muestra el negocio: palabras de la calle o términos técnicos. Llega de la API con la
/// membresía; nunca es una bandera local, y no da permisos.
enum Modo {
  simple('simple'),
  contador('contador');

  const Modo(this.codigo);
  final String codigo;

  static Modo? de(Object? codigo) => values.where((m) => m.codigo == codigo).firstOrNull;
}

/// Acciones que la API autoriza (mismos códigos que la API). La app las usa para mostrar u ocultar botones;
/// quien decide de verdad es la API, que responde «No tienes permiso».
abstract final class Permiso {
  static const vender = 'vender';
  static const gestionarProductos = 'gestionar-productos';
  static const verInformes = 'ver-informes';
  static const anularDocumentos = 'anular-documentos';
  static const gestionarMiembros = 'gestionar-miembros';
}

/// Lo que la membresía le da a la persona en un negocio.
final class Membresia {
  const Membresia({
    required this.rol,
    required this.modo,
    required this.invitada,
    required this.permisos,
    this.exigeSegundoPaso = false,
  });

  final Rol rol;
  final Modo modo;

  /// true si la persona aún no acepta la invitación: no puede entrar todavía.
  final bool invitada;
  final Set<String> permisos;

  /// true si para entrar hay que pasar la verificación en dos pasos (contador o modo contador, HU-04.04).
  final bool exigeSegundoPaso;

  bool puede(String permiso) => permisos.contains(permiso);

  /// «Cajero · modo simple».
  String get descripcion => '${rol.nombre} · modo ${modo.codigo}';

  @override
  bool operator ==(Object other) =>
      other is Membresia &&
      other.rol == rol &&
      other.modo == modo &&
      other.invitada == invitada &&
      other.exigeSegundoPaso == exigeSegundoPaso &&
      other.permisos.length == permisos.length &&
      other.permisos.containsAll(permisos);

  @override
  int get hashCode => Object.hash(rol, modo, invitada, exigeSegundoPaso, Object.hashAllUnordered(permisos));
}
