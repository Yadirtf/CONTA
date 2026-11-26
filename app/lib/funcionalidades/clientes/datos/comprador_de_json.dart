import '../dominio/clientes.dart';

/// Lee un comprador de la API. Un tipo de documento o de persona desconocido es un error de formato: no se
/// muestra un comprador con datos inventados.
Comprador compradorDeJson(Object? datos) {
  final d = datos as Map;
  return Comprador(
    id: d['id'] as String?,
    tipoDeDocumento: TipoDeDocumento.de(d['tipoDocumento']) ?? (throw const FormatException('Tipo de documento desconocido')),
    numero: d['numero'] as String,
    digitoVerificacion: d['digitoVerificacion'] as int?,
    nombre: d['nombre'] as String,
    tipoDePersona: TipoDePersona.de(d['tipoDePersona']) ?? (throw const FormatException('Tipo de persona desconocido')),
    esConsumidorFinal: d['esConsumidorFinal'] == true,
    correo: d['correo'] as String?,
  );
}

ResultadoDeBusqueda busquedaDeJson(Object? datos) {
  final d = datos as Map;
  final nit = d['nit'] as Map?;
  return ResultadoDeBusqueda(
    nit: nit == null ? null : NitCalculado(nit['numero'] as String, nit['digitoVerificacion'] as int),
    compradores: (d['clientes'] as List).map(compradorDeJson).toList(),
  );
}

Map<String, Object?> jsonDeCompradorNuevo(CompradorNuevo nuevo) => {
  'id': nuevo.id,
  'tipoDocumento': nuevo.tipoDeDocumento.codigo,
  'numero': nuevo.numero,
  if (nuevo.digitoVerificacion != null) 'digitoVerificacion': nuevo.digitoVerificacion,
  'nombre': nuevo.nombre,
  'tipoDePersona': nuevo.tipoDePersona.codigo,
  'responsableDeIva': nuevo.responsableDeIva,
  'responsabilidadesFiscales': nuevo.responsabilidadesFiscales,
  if (nuevo.correo != null) 'correo': nuevo.correo,
};
