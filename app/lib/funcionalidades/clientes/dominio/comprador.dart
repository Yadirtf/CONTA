// Dominio de la funcionalidad: Dart puro, sin Flutter ni http.

/// Documentos que acepta la DIAN para el comprador, con el código que usa la API.
enum TipoDeDocumento {
  cedula('13', 'Cédula'),
  nit('31', 'NIT'),
  cedulaDeExtranjeria('22', 'Cédula de extranjería'),
  pasaporte('41', 'Pasaporte'),
  tarjetaDeIdentidad('12', 'Tarjeta de identidad'),
  documentoExtranjero('42', 'Documento extranjero'),
  nitDeOtroPais('50', 'NIT de otro país'),
  tarjetaDeExtranjeria('21', 'Tarjeta de extranjería'),
  registroCivil('11', 'Registro civil'),
  nuip('91', 'NUIP');

  const TipoDeDocumento(this.codigo, this.nombre);

  final String codigo;
  final String nombre;

  static TipoDeDocumento? de(Object? codigo) => values.where((t) => t.codigo == codigo).firstOrNull;
}

/// Persona natural o empresa (jurídica): cambia cómo va el comprador en la factura.
enum TipoDePersona {
  natural('natural', 'Persona'),
  juridica('juridica', 'Empresa');

  const TipoDePersona(this.codigo, this.nombre);

  final String codigo;
  final String nombre;

  static TipoDePersona? de(Object? codigo) => values.where((t) => t.codigo == codigo).firstOrNull;
}

/// A quién se le vende (HU-05.01). El consumidor final no tiene id: no se guarda, es igual para todos.
final class Comprador {
  const Comprador({
    required this.id,
    required this.tipoDeDocumento,
    required this.numero,
    required this.digitoVerificacion,
    required this.nombre,
    required this.tipoDePersona,
    required this.esConsumidorFinal,
    this.correo,
  });

  final String? id;
  final TipoDeDocumento tipoDeDocumento;
  final String numero;
  final int? digitoVerificacion;
  final String nombre;
  final TipoDePersona tipoDePersona;
  final bool esConsumidorFinal;
  final String? correo;

  /// Como se lee el documento: «NIT 800197268-4» o «Cédula 1020304050».
  String get documento =>
      '${tipoDeDocumento.nombre} $numero${digitoVerificacion == null ? '' : '-$digitoVerificacion'}';

  @override
  bool operator ==(Object other) =>
      other is Comprador &&
      other.id == id &&
      other.tipoDeDocumento == tipoDeDocumento &&
      other.numero == numero &&
      other.digitoVerificacion == digitoVerificacion &&
      other.nombre == nombre &&
      other.tipoDePersona == tipoDePersona &&
      other.esConsumidorFinal == esConsumidorFinal &&
      other.correo == correo;

  @override
  int get hashCode =>
      Object.hash(id, tipoDeDocumento, numero, digitoVerificacion, nombre, tipoDePersona, esConsumidorFinal, correo);
}

/// Lo que se manda para crear un comprador. El id lo pone la app: repetir el envío no crea dos.
final class CompradorNuevo {
  const CompradorNuevo({
    required this.id,
    required this.tipoDeDocumento,
    required this.numero,
    required this.nombre,
    required this.tipoDePersona,
    this.digitoVerificacion,
    this.responsableDeIva = false,
    this.responsabilidadesFiscales = const [],
    this.correo,
  });

  final String id;
  final TipoDeDocumento tipoDeDocumento;
  final String numero;
  final int? digitoVerificacion;
  final String nombre;
  final TipoDePersona tipoDePersona;
  final bool responsableDeIva;
  final List<String> responsabilidadesFiscales;
  final String? correo;
}
